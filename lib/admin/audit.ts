import 'server-only'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { getServiceClient } from '@/lib/supabase/server'

/**
 * 관리자 접근 감사 로그.
 *
 * 개인정보 조회 화면이므로 **누가 언제 무엇을 열었는지**를 남긴다.
 * 로그인 실패 기록은 브루트포스 차단에도 함께 쓴다.
 *
 * ⚠️ 기록 실패가 요청을 실패시키지 않는다. 다만 조용히 넘기지 않고 로그로 남긴다.
 *    감사 로그가 안 쌓이는 상황 자체를 알아야 하기 때문이다.
 */

export type AdminAction = 'login_success' | 'login_failed' | 'list_viewed' | 'record_viewed'

/** 로그인 실패 임계값 */
export const LOGIN_LOCK_WINDOW_MINUTES = 15
export const LOGIN_LOCK_MAX_FAILURES = 5

function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headerList.get('x-real-ip') ?? headerList.get('cf-connecting-ip')
}

/**
 * 원문 IP 대신 salt 를 섞은 해시. `inquiries.ip_hash` 와 같은 정책이라
 * 같은 salt 를 쓰면 두 테이블을 대조할 수 있다.
 * salt 가 없으면 해시도 남기지 않는다(salt 없는 IP 해시는 재식별 가능).
 */
function hashIp(ip: string | null): string | null {
  const salt = process.env.INQUIRY_IP_HASH_SALT
  if (!ip || !salt) return null
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export type AuditContext = {
  ipHash: string | null
  userAgent: string | null
}

export async function auditContext(): Promise<AuditContext> {
  const headerList = await headers()
  return {
    ipHash: hashIp(clientIp(headerList)),
    userAgent: headerList.get('user-agent')?.slice(0, 512) ?? null,
  }
}

export async function logAdminAction(input: {
  action: AdminAction
  actor?: string | null
  targetId?: string | null
  context: AuditContext
}): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[admin] 감사 로그를 남길 수 없습니다 — Supabase 미설정')
    return
  }

  const { error } = await supabase.from('admin_audit_log').insert({
    action: input.action,
    actor: input.actor ?? null,
    target_id: input.targetId ?? null,
    ip_hash: input.context.ipHash,
    user_agent: input.context.userAgent,
  })

  if (error) {
    // 감사 로그가 쌓이지 않는 상황은 반드시 드러나야 한다.
    console.error('[admin] 감사 로그 기록 실패', { code: error.code, message: error.message })
  }
}

/**
 * 최근 로그인 실패 횟수. 임계값을 넘으면 로그인을 잠근다.
 *
 * ⚠️ `inquiries` 의 레이트리밋과 같은 한계를 갖는다 — DB 카운트 기반이라
 *    동시 요청에서 원자적이지 않다. 다만 브루트포스는 반복 시도가 전제이므로
 *    억제 효과는 충분하다. 조회 실패 시에는 **잠그는 쪽(fail-closed)** 으로
 *    기울인다. 문의 접수는 가용성이 우선이었지만, 여기는 개인정보 접근이다.
 */
export async function isLoginLocked(context: AuditContext): Promise<boolean> {
  if (!context.ipHash) return false

  const supabase = getServiceClient()
  if (!supabase) return true // 미설정이면 어차피 로그인도 불가

  const since = new Date(Date.now() - LOGIN_LOCK_WINDOW_MINUTES * 60_000).toISOString()
  const { count, error } = await supabase
    .from('admin_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', context.ipHash)
    .eq('action', 'login_failed')
    .gte('created_at', since)

  if (error) {
    console.error('[admin] 로그인 실패 카운트 조회 실패', { message: error.message })
    return true // fail-closed
  }

  return (count ?? 0) >= LOGIN_LOCK_MAX_FAILURES
}
