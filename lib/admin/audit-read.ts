import 'server-only'

import { getServiceClient } from '@/lib/supabase/server'
import type { AdminAction } from './audit'

/**
 * 감사 로그 조회. **관리자 권한 전용**(`audit.read`).
 *
 * ⚠️ 상담자에게 열지 않는다. 누가 무엇을 열람했는지가 담긴다 —
 *    감시 대상이 감시 기록을 볼 수 있으면 감사의 의미가 없다.
 *
 * ⚠️ 이 테이블에는 개인정보가 없다(`ip_hash` 만). 그래도 `user_agent` 와
 *    `ip_hash` 는 특정 담당자를 좁히는 데 쓰일 수 있으므로 외부로 내보내지 않는다.
 */

export type AuditEntry = {
  id: string
  createdAt: string
  action: string
  actor: string | null
  targetId: string | null
  note: string | null
}

export const AUDIT_ACTION_LABEL: Record<AdminAction, string> = {
  login_success: '로그인 성공',
  login_failed: '로그인 실패',
  list_viewed: '문의 목록 조회',
  record_viewed: '문의 상세 조회',
  record_created: '문의 직접 등록',
  status_changed: '처리 상태 변경',
  user_created: '계정 생성',
  user_role_changed: '권한 변경',
  user_disabled: '계정 비활성화',
  user_enabled: '계정 활성화',
  user_deleted: '계정 삭제',
  user_password_reset: '비밀번호 초기화',
  user_unlocked: '잠금 해제',
  sessions_revoked: '세션 강제 만료',
  own_password_changed: '본인 비밀번호 변경',
  user_list_viewed: '계정 목록 조회',
  audit_viewed: '감사 로그 조회',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action as AdminAction] ?? action
}

/**
 * 최근 감사 로그.
 *
 * `action` 으로 걸러 볼 수 있게 한다 — 조회 기록(`*_viewed`)이 대부분이라
 * 필터가 없으면 계정 변경 이력이 묻힌다.
 */
export async function listAuditLog(options: {
  limit?: number
  action?: string | undefined
}): Promise<AuditEntry[] | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  let query = supabase
    .from('admin_audit_log')
    .select('id, created_at, action, actor, target_id, note')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200)

  if (options.action) query = query.eq('action', options.action)

  const { data, error } = await query
  if (error) {
    console.error('[admin] 감사 로그 조회 실패', { code: error.code, message: error.message })
    return null
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    action: String(row.action),
    actor: row.actor ? String(row.actor) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    note: row.note ? String(row.note) : null,
  }))
}
