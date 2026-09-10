'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auditContext, logAdminAction } from '@/lib/admin/audit'
import { can, isAdminRole } from '@/lib/admin/roles'
import { getAdminSession } from '@/lib/admin/session'
import {
  type UserFormState,
  createUserSchema,
  resetPasswordSchema,
  toFieldErrors,
} from '@/lib/admin/user-schema'
import {
  countActiveAdmins,
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  resetUserPassword,
  revokeUserSessions,
  setUserRole,
  setUserStatus,
  unlockUser,
} from '@/lib/admin/users'

// ⚠️ 'use server' 파일은 **async 함수만 export 할 수 있다.**

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 계정 관리 Server Action 공통 가드.
 *
 * ⚠️ Server Action 은 고유 id 로 등록되어 **폼 없이도 직접 POST 될 수 있다.**
 *    상담자가 화면을 못 봐도 액션 id 를 알면 호출할 수 있으므로,
 *    **모든 액션이 여기서 권한을 다시 확인한다.** 화면 숨김은 방어가 아니다.
 */
async function requireUserManager(): Promise<
  { ok: true; actor: string; actorUserId: string | null } | { ok: false; message: string }
> {
  const session = await getAdminSession()
  if (!session) return { ok: false, message: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
  if (!can(session.role, 'user.manage')) {
    return { ok: false, message: '계정 관리 권한이 없습니다.' }
  }
  return { ok: true, actor: session.username, actorUserId: session.userId }
}

function fail(message: string): UserFormState {
  return { status: 'error', message, fieldErrors: {} }
}

/**
 * 마지막 관리자를 보호한다.
 *
 * 관리자를 0명으로 만들면 **계정 관리 화면에 아무도 들어갈 수 없다.**
 * 환경변수 비상 복구 계정이 있으므로 완전한 잠금은 아니지만, 그 경로는
 * 재배포·환경변수 접근이 필요하다. 실수로 그 상황을 만들지 않게 막는다.
 */
async function blocksLastAdmin(targetId: string): Promise<string | null> {
  const target = await getAdminUser(targetId)
  if (!target) return '계정을 찾을 수 없습니다.'
  if (target.role !== 'admin' || target.status !== 'active') return null

  const activeAdmins = await countActiveAdmins()
  if (activeAdmins === null) return '활성 관리자 수를 확인할 수 없어 중단했습니다.'
  if (activeAdmins <= 1) {
    return '마지막 관리자입니다. 다른 관리자를 먼저 만든 뒤에 진행하세요.'
  }
  return null
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const guard = await requireUserManager()
  if (!guard.ok) return fail(guard.message)

  const parsed = createUserSchema.safeParse({
    username: String(formData.get('username') ?? ''),
    role: String(formData.get('role') ?? ''),
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

  const result = await createAdminUser({
    username: parsed.data.username,
    password: parsed.data.password,
    role: parsed.data.role,
    createdBy: guard.actor,
  })
  if ('error' in result) {
    return { status: 'error', message: result.error, fieldErrors: { username: result.error } }
  }

  await logAdminAction({
    action: 'user_created',
    actor: guard.actor,
    targetId: result.id,
    note: `${parsed.data.username} role=${parsed.data.role}`,
    context: await auditContext(),
  })

  revalidatePath('/admin/users')
  // ?created=1 → 상세 화면에서 "담당자에게 전달할 내용" 안내를 한 번 띄운다.
  // 계정만 만들어 두고 무엇을 전달해야 하는지 모르면 첫 로그인이 막힌다.
  redirect(`/admin/users/${result.id}?created=1`)
}

export async function changeUserRole(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireUserManager()
  if (!guard.ok) return fail(guard.message)

  const id = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? '')
  if (!UUID_RE.test(id)) return fail('잘못된 계정 id 입니다.')
  if (!isAdminRole(role)) return fail('잘못된 권한값입니다.')

  const target = await getAdminUser(id)
  if (!target) return fail('계정을 찾을 수 없습니다.')
  if (target.role === role) return fail('이미 같은 권한입니다.')

  // 본인 강등 차단 — 실수로 자기 권한을 잃으면 되돌릴 방법이 없다.
  if (guard.actorUserId === id) return fail('자신의 권한은 바꿀 수 없습니다.')
  if (role === 'agent') {
    const blocked = await blocksLastAdmin(id)
    if (blocked) return fail(blocked)
  }

  const result = await setUserRole(id, role)
  if (result.error) return fail(result.error)

  // 권한이 바뀌면 기존 세션의 토큰에 담긴 역할이 낡은 값이 된다. 즉시 무효화한다.
  await revokeUserSessions(id)

  await logAdminAction({
    action: 'user_role_changed',
    actor: guard.actor,
    targetId: id,
    note: `${target.username}: ${target.role} → ${role}`,
    context: await auditContext(),
  })

  revalidatePath(`/admin/users/${id}`)
  revalidatePath('/admin/users')
  return { status: 'success', message: `권한을 ${role} 로 변경했습니다. 해당 계정의 세션은 만료됐습니다.`, fieldErrors: {} }
}

export async function toggleUserStatus(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireUserManager()
  if (!guard.ok) return fail(guard.message)

  const id = String(formData.get('userId') ?? '')
  const next = String(formData.get('status') ?? '')
  if (!UUID_RE.test(id)) return fail('잘못된 계정 id 입니다.')
  if (next !== 'active' && next !== 'disabled') return fail('잘못된 상태값입니다.')

  const target = await getAdminUser(id)
  if (!target) return fail('계정을 찾을 수 없습니다.')

  if (next === 'disabled') {
    if (guard.actorUserId === id) return fail('자신의 계정은 비활성화할 수 없습니다.')
    const blocked = await blocksLastAdmin(id)
    if (blocked) return fail(blocked)
  }

  const result = await setUserStatus(id, next, guard.actor)
  if (result.error) return fail(result.error)

  await logAdminAction({
    action: next === 'disabled' ? 'user_disabled' : 'user_enabled',
    actor: guard.actor,
    targetId: id,
    note: target.username,
    context: await auditContext(),
  })

  revalidatePath(`/admin/users/${id}`)
  revalidatePath('/admin/users')
  return {
    status: 'success',
    message:
      next === 'disabled'
        ? '계정을 비활성화했습니다. 세션도 즉시 만료됐습니다.'
        : '계정을 활성화했습니다.',
    fieldErrors: {},
  }
}

export async function resetPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireUserManager()
  if (!guard.ok) return fail(guard.message)

  const id = String(formData.get('userId') ?? '')
  if (!UUID_RE.test(id)) return fail('잘못된 계정 id 입니다.')

  const target = await getAdminUser(id)
  if (!target) return fail('계정을 찾을 수 없습니다.')

  const parsed = resetPasswordSchema.safeParse({
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

  const result = await resetUserPassword(id, parsed.data.password)
  if (result.error) return fail(result.error)

  await logAdminAction({
    action: 'user_password_reset',
    actor: guard.actor,
    targetId: id,
    note: target.username,
    context: await auditContext(),
  })

  revalidatePath(`/admin/users/${id}`)
  return {
    status: 'success',
    message:
      '비밀번호를 초기화했습니다. 해당 계정의 세션은 만료됐고, 첫 로그인에서 비밀번호 변경을 요구합니다. 초기 비밀번호는 안전한 경로로 전달하세요.',
    fieldErrors: {},
  }
}

/** 강제 로그아웃. 계정 유출이 의심될 때 즉시 끊는다. */
export async function revokeSessions(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireUserManager()
  if (!guard.ok) return fail(guard.message)

  const id = String(formData.get('userId') ?? '')
  if (!UUID_RE.test(id)) return fail('잘못된 계정 id 입니다.')

  const target = await getAdminUser(id)
  if (!target) return fail('계정을 찾을 수 없습니다.')

  const result = await revokeUserSessions(id)
  if (result.error) return fail(result.error)

  await logAdminAction({
    action: 'sessions_revoked',
    actor: guard.actor,
    targetId: id,
    note: target.username,
    context: await auditContext(),
  })

  revalidatePath(`/admin/users/${id}`)
  return { status: 'success', message: '해당 계정의 모든 세션을 만료시켰습니다.', fieldErrors: {} }
}

export async function unlockAccount(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const guard = await requireUserManager()
  if (!guard.ok) return fail(guard.message)

  const id = String(formData.get('userId') ?? '')
  if (!UUID_RE.test(id)) return fail('잘못된 계정 id 입니다.')

  const target = await getAdminUser(id)
  if (!target) return fail('계정을 찾을 수 없습니다.')

  const result = await unlockUser(id)
  if (result.error) return fail(result.error)

  await logAdminAction({
    action: 'user_unlocked',
    actor: guard.actor,
    targetId: id,
    note: target.username,
    context: await auditContext(),
  })

  revalidatePath(`/admin/users/${id}`)
  return { status: 'success', message: '로그인 잠금을 해제했습니다.', fieldErrors: {} }
}

/**
 * 계정 삭제.
 *
 * ⚠️ 확인 문구로 아이디를 정확히 입력받는다. 삭제는 되돌릴 수 없고, 이력에 남은
 *    계정명이 무엇을 가리키는지 확인할 수 없게 된다. 기본은 비활성화다.
 */
export async function deleteUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const guard = await requireUserManager()
  if (!guard.ok) return fail(guard.message)

  const id = String(formData.get('userId') ?? '')
  const confirm = String(formData.get('confirmUsername') ?? '').trim().toLowerCase()
  if (!UUID_RE.test(id)) return fail('잘못된 계정 id 입니다.')

  const target = await getAdminUser(id)
  if (!target) return fail('계정을 찾을 수 없습니다.')

  if (confirm !== target.username) {
    return {
      status: 'error',
      message: '확인을 위해 삭제할 계정의 아이디를 정확히 입력하세요.',
      fieldErrors: { confirmUsername: '아이디가 일치하지 않습니다.' },
    }
  }

  if (guard.actorUserId === id) return fail('자신의 계정은 삭제할 수 없습니다.')
  const blocked = await blocksLastAdmin(id)
  if (blocked) return fail(blocked)

  const result = await deleteAdminUser(id)
  if (result.error) return fail(result.error)

  await logAdminAction({
    action: 'user_deleted',
    actor: guard.actor,
    targetId: id,
    note: `${target.username} role=${target.role}`,
    context: await auditContext(),
  })

  revalidatePath('/admin/users')
  redirect('/admin/users')
}
