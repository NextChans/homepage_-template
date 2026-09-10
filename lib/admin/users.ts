import 'server-only'

import { getServiceClient } from '@/lib/supabase/server'
import { burnPasswordTime, hashPassword, verifyPassword } from './auth'
import type { AdminRole } from './roles'

/**
 * 관리자 계정(`admin_users`) 읽기·쓰기와 계정 인증.
 *
 * ⚠️ 이 모듈의 함수는 **호출 전에 권한이 확인되었다고 가정한다.**
 *    가드는 Server Action / 페이지에서 한다. service_role 로 RLS 를 우회하므로
 *    권한 확인 없이 부르면 인증 없는 계정 조작이 된다.
 *
 * ⚠️ 비밀번호 해시를 화면·로그·반환값에 절대 내보내지 않는다.
 *    조회 함수는 해시를 뺀 `AdminUser` 만 돌려준다.
 */

/** 계정 단위 로그인 잠금. IP 단위 잠금(`lib/admin/audit.ts`)과 함께 쓴다. */
export const ACCOUNT_LOCK_MAX_FAILURES = 5
export const ACCOUNT_LOCK_MINUTES = 15

/** 화면·목록에 쓰는 계정 정보. **비밀번호 해시가 없다.** */
export type AdminUser = {
  id: string
  username: string
  role: AdminRole
  status: 'active' | 'disabled'
  mustChangePassword: boolean
  createdAt: string
  createdBy: string | null
  lastLoginAt: string | null
  passwordChangedAt: string | null
  failedLoginCount: number
  lockedUntil: string | null
  disabledAt: string | null
  disabledBy: string | null
}

const SELECT_COLUMNS =
  'id, username, role, status, must_change_password, created_at, created_by, last_login_at, password_changed_at, failed_login_count, locked_until, disabled_at, disabled_by'

type Row = Record<string, unknown>

function toUser(row: Row): AdminUser {
  return {
    id: String(row.id),
    username: String(row.username),
    role: row.role === 'admin' ? 'admin' : 'agent',
    status: row.status === 'disabled' ? 'disabled' : 'active',
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: String(row.created_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    passwordChangedAt: row.password_changed_at ? String(row.password_changed_at) : null,
    failedLoginCount: Number(row.failed_login_count ?? 0),
    lockedUntil: row.locked_until ? String(row.locked_until) : null,
    disabledAt: row.disabled_at ? String(row.disabled_at) : null,
    disabledBy: row.disabled_by ? String(row.disabled_by) : null,
  }
}

/**
 * 세션 무효화 값. **카운터가 아니라 현재 시각(Unix 초)** 이다.
 *
 * `epoch = epoch + 1` 은 읽고-쓰는 두 단계라 동시 요청에서 증가가 유실될 수 있고,
 * 유실되면 무효화해야 할 세션이 살아남는다. 시각은 읽지 않고 바로 쓰므로 경쟁이 없다.
 */
function newEpoch(): number {
  return Math.floor(Date.now() / 1000)
}

// ── 조회 ────────────────────────────────────────────────────────────────────

export async function listAdminUsers(): Promise<AdminUser[] | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('admin_users')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[admin] 계정 목록 조회 실패', { code: error.code, message: error.message })
    return null
  }
  return (data ?? []).map((r) => toUser(r as Row))
}

export async function getAdminUser(id: string): Promise<AdminUser | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('admin_users')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin] 계정 조회 실패', { code: error.code, message: error.message })
    return null
  }
  return data ? toUser(data as Row) : null
}

/** 활성 관리자 수. **마지막 관리자 보호**에 쓴다. */
export async function countActiveAdmins(): Promise<number | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { count, error } = await supabase
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('status', 'active')

  if (error) {
    console.error('[admin] 활성 관리자 수 조회 실패', { code: error.code, message: error.message })
    return null
  }
  return count ?? 0
}

/** 세션 검증용. 계정 상태와 epoch 를 확인하기 위해 최소 컬럼만 읽는다. */
export async function getSessionUser(
  id: string,
): Promise<{ username: string; role: AdminRole; status: string; epoch: number; mustChangePassword: boolean } | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('admin_users')
    .select('username, role, status, session_epoch, must_change_password')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin] 세션 계정 조회 실패', { code: error.code, message: error.message })
    return null
  }
  if (!data) return null

  return {
    username: String(data.username),
    role: data.role === 'admin' ? 'admin' : 'agent',
    status: String(data.status),
    epoch: Number(data.session_epoch),
    mustChangePassword: Boolean(data.must_change_password),
  }
}

// ── 인증 ────────────────────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; user: AdminUser; epoch: number }
  | { ok: false; reason: 'invalid' | 'locked' | 'disabled' | 'unavailable' }

/**
 * DB 계정으로 로그인한다.
 *
 * ⚠️ 계정이 없을 때도 **더미 해시로 시간을 쓴다**(`burnPasswordTime`).
 *    즉시 실패하면 응답 시간으로 계정 존재 여부가 드러난다.
 *
 * ⚠️ `disabled` / `locked` 는 **비밀번호가 맞은 경우에만** 알려준다.
 *    비밀번호를 모르는 사람에게는 `invalid` 와 구분되지 않으므로 계정 존재가
 *    새지 않고, 정당한 담당자에게는 원인을 알려줄 수 있다.
 */
export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  const supabase = getServiceClient()
  if (!supabase) return { ok: false, reason: 'unavailable' }

  const normalized = username.trim().toLowerCase()

  const { data, error } = await supabase
    .from('admin_users')
    .select(`${SELECT_COLUMNS}, password_hash, session_epoch`)
    .eq('username', normalized)
    .maybeSingle()

  if (error) {
    console.error('[admin] 계정 인증 조회 실패', { code: error.code, message: error.message })
    return { ok: false, reason: 'unavailable' }
  }

  if (!data) {
    burnPasswordTime(password)
    return { ok: false, reason: 'invalid' }
  }

  const row = data as Row
  const passwordOk = verifyPassword(password, String(row.password_hash))

  if (!passwordOk) {
    await registerLoginFailure(String(row.id))
    return { ok: false, reason: 'invalid' }
  }

  // 여기부터는 비밀번호가 맞은 경우다 — 원인을 알려줘도 계정 존재가 새지 않는다.
  const user = toUser(row)

  if (user.status === 'disabled') return { ok: false, reason: 'disabled' }

  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    return { ok: false, reason: 'locked' }
  }

  const epoch = Number(row.session_epoch)
  await registerLoginSuccess(user.id)
  return { ok: true, user, epoch }
}

async function registerLoginSuccess(id: string): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  const { error } = await supabase
    .from('admin_users')
    .update({ failed_login_count: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[admin] 로그인 성공 기록 실패', { code: error.code, message: error.message })
  }
}

/**
 * 실패 횟수를 올리고 임계값을 넘으면 계정을 잠근다.
 *
 * ⚠️ 읽고-쓰기라 원자적이지 않다. 동시 요청에서 카운트가 유실될 수 있지만,
 *    브루트포스는 반복 시도가 전제이므로 억제 효과는 충분하다. IP 단위 잠금이
 *    함께 걸리므로 두 겹이다.
 */
async function registerLoginFailure(id: string): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  const { data, error: readError } = await supabase
    .from('admin_users')
    .select('failed_login_count')
    .eq('id', id)
    .maybeSingle()

  if (readError || !data) {
    console.error('[admin] 실패 횟수 조회 실패', { code: readError?.code, message: readError?.message })
    return
  }

  const next = Number(data.failed_login_count ?? 0) + 1
  const lock = next >= ACCOUNT_LOCK_MAX_FAILURES

  const { error } = await supabase
    .from('admin_users')
    .update({
      failed_login_count: next,
      locked_until: lock
        ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60_000).toISOString()
        : null,
    })
    .eq('id', id)

  if (error) {
    console.error('[admin] 실패 횟수 기록 실패', { code: error.code, message: error.message })
  }
}

// ── 계정 관리 (admin 권한 필요) ─────────────────────────────────────────────

export async function createAdminUser(input: {
  username: string
  password: string
  role: AdminRole
  createdBy: string
}): Promise<{ id: string } | { error: string }> {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'Supabase 환경변수가 설정되지 않았습니다.' }

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      username: input.username.trim().toLowerCase(),
      password_hash: hashPassword(input.password),
      role: input.role,
      // 관리자가 정한 초기 비밀번호로는 업무를 못 하게 한다.
      must_change_password: true,
      session_epoch: newEpoch(),
      created_by: input.createdBy,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin] 계정 생성 실패', { code: error.code, message: error.message })
    // 23505 = unique_violation
    if (error.code === '23505') return { error: '이미 존재하는 아이디입니다.' }
    return { error: '계정 생성에 실패했습니다.' }
  }
  return { id: String(data.id) }
}

export async function setUserRole(id: string, role: AdminRole): Promise<{ error?: string }> {
  return update(id, { role }, '권한 변경')
}

export async function setUserStatus(
  id: string,
  status: 'active' | 'disabled',
  actor: string,
): Promise<{ error?: string }> {
  // 비활성화하면 세션도 즉시 끊는다. 상태만 바꾸고 세션을 남기면
  // 최대 8시간 동안 계속 접근할 수 있다.
  const patch =
    status === 'disabled'
      ? {
          status,
          session_epoch: newEpoch(),
          disabled_at: new Date().toISOString(),
          disabled_by: actor,
        }
      : { status, disabled_at: null, disabled_by: null, failed_login_count: 0, locked_until: null }

  return update(id, patch, '상태 변경')
}

/** 비밀번호 초기화. 첫 로그인에서 변경을 강제하고 기존 세션을 무효화한다. */
export async function resetUserPassword(id: string, password: string): Promise<{ error?: string }> {
  return update(
    id,
    {
      password_hash: hashPassword(password),
      must_change_password: true,
      session_epoch: newEpoch(),
      failed_login_count: 0,
      locked_until: null,
    },
    '비밀번호 초기화',
  )
}

/** 본인 비밀번호 변경. 변경 후 다른 기기의 세션은 무효가 된다. */
export async function changeOwnPassword(id: string, password: string): Promise<{ error?: string }> {
  return update(
    id,
    {
      password_hash: hashPassword(password),
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
      session_epoch: newEpoch(),
    },
    '비밀번호 변경',
  )
}

/** 강제 로그아웃. 해당 계정의 모든 세션을 즉시 무효화한다. */
export async function revokeUserSessions(id: string): Promise<{ error?: string }> {
  return update(id, { session_epoch: newEpoch() }, '세션 강제 만료')
}

/** 로그인 잠금 해제. */
export async function unlockUser(id: string): Promise<{ error?: string }> {
  return update(id, { failed_login_count: 0, locked_until: null }, '잠금 해제')
}

/**
 * 계정 삭제.
 *
 * ⚠️ 기본은 비활성화다. 삭제하면 `created_by`/`changed_by` 가 가리키는 대상이
 *    사라져 이력 해석이 어려워진다. 감사 로그(`admin_audit_log`)는 FK 가 없어
 *    남지만, 그 안의 계정명이 무엇을 가리키는지 확인할 수 없게 된다.
 */
export async function deleteAdminUser(id: string): Promise<{ error?: string }> {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'Supabase 환경변수가 설정되지 않았습니다.' }

  const { error } = await supabase.from('admin_users').delete().eq('id', id)
  if (error) {
    console.error('[admin] 계정 삭제 실패', { code: error.code, message: error.message })
    return { error: '계정 삭제에 실패했습니다.' }
  }
  return {}
}

async function update(id: string, patch: Row, label: string): Promise<{ error?: string }> {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'Supabase 환경변수가 설정되지 않았습니다.' }

  const { error } = await supabase.from('admin_users').update(patch).eq('id', id)
  if (error) {
    console.error(`[admin] ${label} 실패`, { code: error.code, message: error.message })
    return { error: `${label}에 실패했습니다.` }
  }
  return {}
}
