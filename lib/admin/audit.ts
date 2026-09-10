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

/**
 * ⚠️ 값을 늘리면 `supabase/migrations/` 의 `admin_audit_log_action_check` 제약도
 *    **함께** 고친다. 한쪽만 고치면 insert 가 조용히 실패해 감사 로그가 비어버린다.
 */
export type AdminAction =
  | 'login_success'
  | 'login_failed'
  | 'list_viewed'
  | 'record_viewed'
  | 'record_created'
  | 'status_changed'

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
 * 로그인 시도를 막아야 하는가. 막아야 하면 **이유**를 함께 돌려준다.
 *
 * ⚠️ `unavailable` 을 따로 두는 이유 — 감사 로그를 조회할 수 없으면 잠그는 쪽으로
 *    기울인다(fail-closed). 그런데 이때 "시도가 너무 많습니다" 라고 표시하면
 *    **설정 실수를 브루트포스로 오인하게 만든다.** 실제로 이 메시지 때문에
 *    원인을 찾는 데 시간을 썼다. 두 상태를 구분해 운영자가 바로 알 수 있게 한다.
 *
 * ⚠️ `inquiries` 의 레이트리밋과 같은 한계를 갖는다 — DB 카운트 기반이라 동시
 *    요청에서 원자적이지 않다. 다만 브루트포스는 반복 시도가 전제이므로 억제
 *    효과는 충분하다. 조회 실패 시 판단을 뒤집는 것(문의 접수는 가용성 우선,
 *    여기는 개인정보 접근이라 차단 우선)이 이 함수의 핵심이다.
 *
 * ⚠️ `ipHash` 가 없으면(= `INQUIRY_IP_HASH_SALT` 미설정) **잠금이 동작하지 않는다.**
 *    salt 없는 IP 해시는 사실상 재식별 가능해서 만들지 않기 때문이다.
 *    관리자 페이지를 켤 때 salt 설정을 함께 확인해야 한다.
 */
export type LoginGate = 'ok' | 'locked' | 'unavailable'

export async function loginGate(context: AuditContext): Promise<LoginGate> {
  if (!context.ipHash) return 'ok'

  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[admin] 로그인 차단 — Supabase 미설정으로 실패 횟수를 확인할 수 없음')
    return 'unavailable'
  }

  const since = new Date(Date.now() - LOGIN_LOCK_WINDOW_MINUTES * 60_000).toISOString()
  const { count, error } = await supabase
    .from('admin_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', context.ipHash)
    .eq('action', 'login_failed')
    .gte('created_at', since)

  if (error) {
    // 테이블이 없는 경우(마이그레이션 미실행)도 여기로 온다. 자주 겪는 실수라
    // 코드를 함께 남겨 로그만 보고 판별할 수 있게 한다.
    console.error('[admin] 로그인 차단 — 실패 횟수 조회 실패', {
      code: error.code,
      message: error.message,
    })
    return 'unavailable'
  }

  return (count ?? 0) >= LOGIN_LOCK_MAX_FAILURES ? 'locked' : 'ok'
}
