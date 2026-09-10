import 'server-only'

import { getServiceClient } from '@/lib/supabase/server'
import { HANDLED_STATUSES, type InquiryStatus } from './status'
import type { ManualInquiryInput } from './manual-inquiry-schema'

/**
 * 문의 **쓰기** 경로. 조회는 `lib/admin/inquiries.ts` 에 있다.
 *
 * ⚠️ 읽기와 쓰기를 **일부러 다른 모듈로 나눴다.** 어떤 코드가 고객 개인정보를
 *    변경할 수 있는지 import 만 보고 알 수 있어야 한다. 조회 모듈에 쓰기 함수를
 *    끼워 넣으면 그 경계가 사라진다.
 *
 * ⚠️ 여기의 모든 함수는 **호출 전에 관리자 세션이 확인되었다고 가정한다.**
 *    가드는 Server Action(`app/admin/actions.ts`) 에서 한다. 이 모듈은
 *    service_role 로 RLS 를 우회하므로 가드 없이 부르면 인증 없는 쓰기가 된다.
 */

/** 상태 변경 이력 한 줄. 화면에 그대로 보여준다. */
export type StatusHistoryEntry = {
  id: string
  changedAt: string
  fromStatus: string | null
  toStatus: string
  changedBy: string
  note: string | null
}

export async function listStatusHistory(inquiryId: string): Promise<StatusHistoryEntry[]> {
  const supabase = getServiceClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('inquiry_status_history')
    .select('id, changed_at, from_status, to_status, changed_by, note')
    .eq('inquiry_id', inquiryId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('[admin] 상태 이력 조회 실패', { code: error.code, message: error.message })
    return []
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    changedAt: String(row.changed_at),
    fromStatus: row.from_status ? String(row.from_status) : null,
    toStatus: String(row.to_status),
    changedBy: String(row.changed_by),
    note: row.note ? String(row.note) : null,
  }))
}

/**
 * 전화·이메일로 들어온 문의를 직접 등록한다.
 *
 * 등록과 동시에 이력 첫 줄(`from_status: null`)을 남긴다. 이력이 비어 있는 문의를
 * 만들지 않는다 — "언제 누가 접수했는지" 가 이력의 시작점이어야 한다.
 *
 * ⚠️ `ip_hash` 를 남기지 않는다. 관리자가 입력한 것이므로 관리자의 IP 가 찍히면
 *    문의자의 유입 정보로 오해된다. 등록자는 `created_by` 로 남긴다.
 */
export async function createInquiry(
  input: ManualInquiryInput,
  actor: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'Supabase 환경변수가 설정되지 않았습니다.' }

  const handled = HANDLED_STATUSES.includes(input.status)

  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      name: input.name,
      company: input.company,
      email: input.email ?? null,
      phone: input.phone ?? null,
      service_slug: input.serviceSlug,
      message: input.message,
      privacy_consent: input.privacyConsent,
      marketing_consent: input.marketingConsent,
      intake_channel: input.intakeChannel,
      created_by: actor,
      status: input.status,
      handled_at: handled ? new Date().toISOString() : null,
      handled_by: handled ? actor : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin] 문의 직접 등록 실패', { code: error.code, message: error.message })
    return { error: '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.' }
  }

  const id = String(data.id)

  // 이력 기록이 실패해도 등록 자체는 되돌리지 않는다(문의를 잃는 것이 더 나쁘다).
  // 다만 조용히 넘기지 않고 로그로 드러낸다.
  const { error: historyError } = await supabase.from('inquiry_status_history').insert({
    inquiry_id: id,
    from_status: null,
    to_status: input.status,
    changed_by: actor,
    note: input.note ?? null,
  })

  if (historyError) {
    console.error('[admin] 등록 이력 기록 실패', {
      code: historyError.code,
      message: historyError.message,
    })
  }

  return { id }
}

/**
 * 처리 상태를 바꾸고 **이력을 남긴다.**
 *
 * - 현재 상태를 먼저 읽어 `from_status` 를 채운다. 같은 상태면 아무것도 하지 않는다
 *   (메모만 남기려는 경우도 이력이 쌓이면 노이즈가 된다).
 * - `contacted`/`closed`/`spam` 으로 가면 `handled_by`/`handled_at` 을 채우고,
 *   `received`/`in_review` 로 되돌리면 비운다 — 처리 정보가 사실과 어긋나면 안 된다.
 * - `updated_at` 은 DB 트리거가 갱신한다(20260910000001 의 set_updated_at).
 */
export async function changeStatus(input: {
  inquiryId: string
  toStatus: InquiryStatus
  actor: string
  note?: string | undefined
}): Promise<{ ok: true; from: string } | { error: string }> {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'Supabase 환경변수가 설정되지 않았습니다.' }

  const { data: current, error: readError } = await supabase
    .from('inquiries')
    .select('status')
    .eq('id', input.inquiryId)
    .maybeSingle()

  if (readError) {
    console.error('[admin] 상태 변경 전 조회 실패', {
      code: readError.code,
      message: readError.message,
    })
    return { error: '문의를 불러올 수 없습니다.' }
  }
  if (!current) return { error: '문의를 찾을 수 없습니다.' }

  const fromStatus = String(current.status)
  if (fromStatus === input.toStatus && !input.note) {
    return { error: '이미 같은 상태입니다.' }
  }

  const handled = HANDLED_STATUSES.includes(input.toStatus)

  const { error: updateError } = await supabase
    .from('inquiries')
    .update({
      status: input.toStatus,
      handled_at: handled ? new Date().toISOString() : null,
      handled_by: handled ? input.actor : null,
    })
    .eq('id', input.inquiryId)

  if (updateError) {
    console.error('[admin] 상태 변경 실패', {
      code: updateError.code,
      message: updateError.message,
    })
    return { error: '상태 변경에 실패했습니다.' }
  }

  const { error: historyError } = await supabase.from('inquiry_status_history').insert({
    inquiry_id: input.inquiryId,
    from_status: fromStatus,
    to_status: input.toStatus,
    changed_by: input.actor,
    note: input.note ?? null,
  })

  if (historyError) {
    // 상태는 이미 바뀌었다. 이력만 빠진 상태를 반드시 드러낸다.
    console.error('[admin] 상태 변경 이력 기록 실패 — 상태는 변경됨', {
      code: historyError.code,
      message: historyError.message,
    })
  }

  return { ok: true, from: fromStatus }
}
