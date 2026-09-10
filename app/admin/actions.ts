'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  LOGIN_LOCK_WINDOW_MINUTES,
  auditContext,
  logAdminAction,
  loginGate,
} from '@/lib/admin/audit'
import {
  checkCredentials,
  endSession,
  getAdminSession,
  isAdminConfigured,
  startSession,
} from '@/lib/admin/auth'
import { changeStatus, createInquiry } from '@/lib/admin/inquiry-write'
import type { LoginState } from '@/lib/admin/login-state'
import {
  type ManualInquiryFieldErrors,
  type ManualInquiryState,
  type StatusChangeState,
  manualInquirySchema,
} from '@/lib/admin/manual-inquiry-schema'
import { type InquiryStatus, STATUS_LABEL, isInquiryStatus } from '@/lib/admin/status'

/** 문의 id 형식 검사. 임의 문자열로 쓰기를 시도하지 못하게 한다. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ⚠️ 이 파일은 'use server' 다. **async 함수만 export 할 수 있다.**
//    타입·상수를 내보내면 빌드가 깨진다(invalid-use-server-value).
//    LoginState / initialLoginState 는 lib/admin/login-state.ts 에 있다.

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // 자격증명이 설정되지 않았으면 관리자 기능 자체가 없다.
  if (!isAdminConfigured()) return { error: '관리자 기능이 설정되지 않았습니다.' }

  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  const context = await auditContext()

  // 브루트포스 차단을 자격증명 검증보다 먼저 한다.
  // 차단 이유를 구분해 알려준다 — 설정 실수를 브루트포스로 오인하면
  // 원인을 찾을 수 없다. 둘 다 자격증명 정보를 흘리지 않는다.
  const gate = await loginGate(context)
  if (gate === 'locked') {
    return {
      error: `로그인 시도가 너무 많습니다. ${LOGIN_LOCK_WINDOW_MINUTES}분 후 다시 시도해 주세요.`,
    }
  }
  if (gate === 'unavailable') {
    return {
      error:
        '감사 로그를 확인할 수 없어 로그인을 차단했습니다. Supabase 설정과 admin_audit_log 테이블을 확인하세요.',
    }
  }

  if (!checkCredentials(username, password)) {
    await logAdminAction({ action: 'login_failed', actor: username.slice(0, 80), context })
    // ⚠️ 아이디·비밀번호 중 무엇이 틀렸는지 구분해 알려주지 않는다.
    //    사용자명 존재 여부가 새는 것을 막는다.
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  await logAdminAction({ action: 'login_success', actor: username.trim(), context })
  await startSession()
  redirect('/admin')
}

export async function logout(): Promise<void> {
  await endSession()
  redirect('/admin/login')
}

/**
 * 전화·이메일로 들어온 문의를 직접 등록한다.
 *
 * ⚠️ Server Action 은 모듈 그래프에 포함되면 고유 id 로 등록되어 **폼 없이도 직접
 *    POST 될 수 있다.** 따라서 화면을 가리는 것만으로는 부족하고 **여기서 세션을
 *    직접 확인한다.** `requireAdminSession()` 대신 `getAdminSession()` 을 쓰는
 *    이유는, Action 에서 `notFound()` 를 던지는 것보다 사용자에게 "다시 로그인" 을
 *    알려주는 편이 낫기 때문이다.
 */
export async function createManualInquiry(
  _prev: ManualInquiryState,
  formData: FormData,
): Promise<ManualInquiryState> {
  const session = await getAdminSession()
  if (!session) {
    return {
      status: 'error',
      message: '세션이 만료되었습니다. 다시 로그인해 주세요.',
      fieldErrors: {},
    }
  }

  const parsed = manualInquirySchema.safeParse({
    name: formData.get('name') ?? '',
    company: formData.get('company') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    serviceSlug: formData.get('serviceSlug') ?? '',
    message: formData.get('message') ?? '',
    intakeChannel: formData.get('intakeChannel') ?? '',
    status: formData.get('status') ?? 'received',
    privacyConsent: formData.get('privacyConsent') === 'on',
    marketingConsent: formData.get('marketingConsent') === 'on',
    note: formData.get('note') ?? '',
  })

  if (!parsed.success) {
    // ⚠️ 입력값(개인정보)을 로그에 출력하지 않는다. 필드명과 메시지만 화면에 돌려준다.
    const fieldErrors: ManualInquiryFieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = (issue.path[0] ?? 'form') as keyof ManualInquiryFieldErrors
      fieldErrors[key] ??= issue.message
    }
    return { status: 'error', message: '입력을 확인해 주세요.', fieldErrors }
  }

  const result = await createInquiry(parsed.data, session.username)
  if ('error' in result) {
    return { status: 'error', message: result.error, fieldErrors: {} }
  }

  await logAdminAction({
    action: 'record_created',
    actor: session.username,
    targetId: result.id,
    context: await auditContext(),
  })

  // 목록 캐시를 비운다 — force-dynamic 이지만 라우터 캐시가 남을 수 있다.
  revalidatePath('/admin')
  redirect(`/admin/${result.id}`)
}

/**
 * 처리 상태를 변경한다. 이력은 `changeStatus` 가 남긴다.
 *
 * ⚠️ 여기서도 세션을 직접 확인한다(위와 같은 이유).
 */
export async function changeInquiryStatus(
  _prev: StatusChangeState,
  formData: FormData,
): Promise<StatusChangeState> {
  const session = await getAdminSession()
  if (!session) {
    return { status: 'error', message: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
  }

  const inquiryId = String(formData.get('inquiryId') ?? '')
  const toStatus = String(formData.get('status') ?? '')
  const rawNote = String(formData.get('note') ?? '').trim()

  if (!UUID_RE.test(inquiryId)) {
    return { status: 'error', message: '잘못된 문의 id 입니다.' }
  }
  if (!isInquiryStatus(toStatus)) {
    return { status: 'error', message: '잘못된 상태값입니다.' }
  }
  if (rawNote.length > 500) {
    return { status: 'error', message: '메모는 500자까지 입력할 수 있습니다.' }
  }

  const result = await changeStatus({
    inquiryId,
    toStatus,
    actor: session.username,
    note: rawNote === '' ? undefined : rawNote,
  })

  if ('error' in result) {
    return { status: 'error', message: result.error }
  }

  await logAdminAction({
    action: 'status_changed',
    actor: session.username,
    targetId: inquiryId,
    context: await auditContext(),
  })

  revalidatePath(`/admin/${inquiryId}`)
  revalidatePath('/admin')
  return {
    status: 'success',
    message: `${STATUS_LABEL[result.from as InquiryStatus] ?? result.from} → ${STATUS_LABEL[toStatus]} 으로 변경했습니다.`,
  }
}
