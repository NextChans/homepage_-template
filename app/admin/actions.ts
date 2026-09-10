'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  LOGIN_LOCK_WINDOW_MINUTES,
  auditContext,
  logAdminAction,
  loginGate,
} from '@/lib/admin/audit'
import { checkBootstrapCredentials, endSession, isAdminConfigured } from '@/lib/admin/auth'
import { changeStatus, createInquiry } from '@/lib/admin/inquiry-write'
import { can } from '@/lib/admin/roles'
import type { LoginState } from '@/lib/admin/login-state'
import {
  type ManualInquiryFieldErrors,
  type ManualInquiryState,
  type StatusChangeState,
  manualInquirySchema,
} from '@/lib/admin/manual-inquiry-schema'
import { getAdminSession, startSession } from '@/lib/admin/session'
import { type InquiryStatus, STATUS_LABEL, isInquiryStatus } from '@/lib/admin/status'
import {
  type UserFormState,
  changeOwnPasswordSchema,
  toFieldErrors,
} from '@/lib/admin/user-schema'
import { authenticateUser, changeOwnPassword } from '@/lib/admin/users'

// ⚠️ 이 파일은 'use server' 다. **async 함수만 export 할 수 있다.**
//    타입·상수를 내보내면 빌드가 깨진다(invalid-use-server-value).

/** 문의 id 형식 검사. 임의 문자열로 쓰기를 시도하지 못하게 한다. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 아이디·비밀번호 중 무엇이 틀렸는지 구분해 알려주지 않는다. */
const GENERIC_LOGIN_ERROR = '아이디 또는 비밀번호가 올바르지 않습니다.'

/**
 * 로그인. **DB 계정을 먼저 시도하고, 실패하면 비상 복구(환경변수) 계정을 본다.**
 *
 * 순서가 이렇게 된 이유: 일상 업무는 DB 계정으로 한다. 환경변수 계정은
 * DB 계정이 전부 잠기거나 Supabase 가 죽었을 때를 위한 경로이므로 뒤에 둔다.
 * 두 경로 모두 실패 시 **같은 메시지**를 돌려준다.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) return { error: '관리자 기능이 설정되지 않았습니다.' }

  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  const context = await auditContext()

  // IP 단위 차단을 자격증명 검증보다 먼저 한다.
  // 차단 이유를 구분해 알려준다 — 설정 실수를 브루트포스로 오인하면 원인을 찾을 수 없다.
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

  // 1) DB 계정
  const result = await authenticateUser(username, password)

  if (result.ok) {
    await logAdminAction({
      action: 'login_success',
      actor: result.user.username,
      targetId: result.user.id,
      note: `role=${result.user.role}`,
      context,
    })
    await startSession({
      username: result.user.username,
      role: result.user.role,
      userId: result.user.id,
      epoch: result.epoch,
    })
    redirect(result.user.mustChangePassword ? '/admin/password' : '/admin')
  }

  // 비밀번호가 맞았지만 계정 상태가 막는 경우 — 원인을 알려줘도 계정 존재가 새지 않는다.
  if (result.reason === 'disabled') {
    await logAdminAction({ action: 'login_failed', actor: username.trim().slice(0, 40), note: 'disabled', context })
    return { error: '비활성화된 계정입니다. 관리자에게 문의하세요.' }
  }
  if (result.reason === 'locked') {
    await logAdminAction({ action: 'login_failed', actor: username.trim().slice(0, 40), note: 'locked', context })
    return {
      error: `로그인 실패가 반복되어 계정이 잠겼습니다. 관리자에게 잠금 해제를 요청하거나 잠시 후 다시 시도하세요.`,
    }
  }

  // 2) 비상 복구(환경변수) 계정
  if (checkBootstrapCredentials(username, password)) {
    await logAdminAction({
      action: 'login_success',
      actor: username.trim().slice(0, 40),
      note: 'bootstrap(비상 복구 계정)',
      context,
    })
    await startSession({
      username: username.trim(),
      role: 'admin',
      userId: null,
      epoch: 0,
    })
    redirect('/admin')
  }

  await logAdminAction({ action: 'login_failed', actor: username.trim().slice(0, 40), context })
  return { error: GENERIC_LOGIN_ERROR }
}

export async function logout(): Promise<void> {
  await endSession()
  redirect('/admin/login')
}

/**
 * 본인 비밀번호 변경.
 *
 * ⚠️ 변경하면 `session_epoch` 가 갱신되어 **다른 기기의 세션이 모두 끊긴다.**
 *    현재 기기는 새 세션을 발급해 유지한다 — 바꾸자마자 로그아웃되면 최악의 UX 다.
 *
 * ⚠️ 비상 복구(환경변수) 계정은 여기서 바꿀 수 없다. 그 비밀번호는 환경변수라
 *    Vercel 에서 교체하고 재배포해야 한다.
 */
export async function changeMyPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await getAdminSession()
  if (!session) {
    return { status: 'error', message: '세션이 만료되었습니다. 다시 로그인해 주세요.', fieldErrors: {} }
  }
  if (session.isBootstrap || !session.userId) {
    return {
      status: 'error',
      message:
        '비상 복구 계정의 비밀번호는 여기서 바꿀 수 없습니다. Vercel 환경변수 ADMIN_PASSWORD_HASH 를 교체하고 재배포하세요.',
      fieldErrors: {},
    }
  }

  const parsed = changeOwnPasswordSchema.safeParse({
    currentPassword: String(formData.get('currentPassword') ?? ''),
    password: String(formData.get('password') ?? ''),
    passwordConfirm: String(formData.get('passwordConfirm') ?? ''),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: '입력을 확인해 주세요.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  // 현재 비밀번호를 확인한다. 세션 탈취만으로 비밀번호를 바꿀 수 없게 한다.
  const check = await authenticateUser(session.username, parsed.data.currentPassword)
  if (!check.ok) {
    return {
      status: 'error',
      message: '현재 비밀번호가 올바르지 않습니다.',
      fieldErrors: { currentPassword: '현재 비밀번호가 올바르지 않습니다.' },
    }
  }

  const changed = await changeOwnPassword(session.userId, parsed.data.password)
  if (changed.error) {
    return { status: 'error', message: changed.error, fieldErrors: {} }
  }

  await logAdminAction({
    action: 'own_password_changed',
    actor: session.username,
    targetId: session.userId,
    context: await auditContext(),
  })

  // epoch 가 바뀌었으므로 현재 기기의 세션을 새로 발급한다. 하지 않으면 즉시 로그아웃된다.
  const refreshed = await authenticateUser(session.username, parsed.data.password)
  if (refreshed.ok) {
    await startSession({
      username: refreshed.user.username,
      role: refreshed.user.role,
      userId: refreshed.user.id,
      epoch: refreshed.epoch,
    })
  }

  revalidatePath('/admin')
  redirect('/admin')
}

/**
 * 전화·이메일로 들어온 문의를 직접 등록한다.
 *
 * ⚠️ Server Action 은 모듈 그래프에 포함되면 고유 id 로 등록되어 **폼 없이도 직접
 *    POST 될 수 있다.** 따라서 화면을 가리는 것만으로는 부족하고 **여기서 세션과
 *    권한을 직접 확인한다.**
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
  // 권한을 역할 이름이 아니라 권한 단위로 확인한다. 역할이 늘어도 여기를 고치지 않는다.
  if (!can(session.role, 'inquiry.create')) {
    return { status: 'error', message: '문의 등록 권한이 없습니다.', fieldErrors: {} }
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
    note: `channel=${parsed.data.intakeChannel}`,
    context: await auditContext(),
  })

  revalidatePath('/admin')
  redirect(`/admin/${result.id}`)
}

/** 처리 상태를 변경한다. 이력은 `changeStatus` 가 남긴다. */
export async function changeInquiryStatus(
  _prev: StatusChangeState,
  formData: FormData,
): Promise<StatusChangeState> {
  const session = await getAdminSession()
  if (!session) {
    return { status: 'error', message: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
  }
  if (!can(session.role, 'inquiry.status')) {
    return { status: 'error', message: '상태 변경 권한이 없습니다.' }
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
    note: `${result.from} → ${toStatus}`,
    context: await auditContext(),
  })

  revalidatePath(`/admin/${inquiryId}`)
  revalidatePath('/admin')
  return {
    status: 'success',
    message: `${STATUS_LABEL[result.from as InquiryStatus] ?? result.from} → ${STATUS_LABEL[toStatus]} 으로 변경했습니다.`,
  }
}
