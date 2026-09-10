import 'server-only'

import { getServiceClient } from '@/lib/supabase/server'

/**
 * 관리자 화면용 문의 **조회**. 이 모듈에는 쓰기 함수를 넣지 않는다.
 *
 * 쓰기(직접 등록·상태 변경)는 `lib/admin/inquiry-write.ts` 에 있다.
 * 어떤 코드가 고객 개인정보를 변경할 수 있는지 import 만 보고 알 수 있게
 * 일부러 나눴다. (ADR-018)
 */

export type InquiryListItem = {
  id: string
  createdAt: string
  company: string
  name: string
  serviceSlug: string
  status: string
  /** 유입 경로. web=홈페이지 폼, phone/email/offline=직접 등록. */
  intakeChannel: string
  /** 마스킹된 값. 목록에서는 전체 값을 노출하지 않는다. 값이 없으면 `null`. */
  emailMasked: string | null
  phoneMasked: string | null
}

export type InquiryDetail = InquiryListItem & {
  /** 전화 문의는 이메일이, 이메일 문의는 연락처가 없을 수 있다. */
  email: string | null
  phone: string | null
  message: string
  privacyConsent: boolean
  marketingConsent: boolean
  sourcePath: string | null
  handledAt: string | null
  handledBy: string | null
  /** 직접 등록한 관리자. 홈페이지 폼 유입은 `null`. */
  createdBy: string | null
}

/**
 * 목록에서 개인정보를 전체 노출하지 않는다.
 *
 * 목록은 한 화면에 수십 건이 뜨고 스크린샷·화면공유로 새기 쉽다. 담당자가
 * 실제로 필요한 것은 "누구에게서 왔는지" 식별이고, 연락처 전체는 상세에서
 * 보면 된다. 노출 최소화는 사고 시 피해 범위를 줄인다.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 1) return '***'
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const head = local.slice(0, Math.min(2, local.length))
  return `${head}${'*'.repeat(Math.max(local.length - head.length, 1))}${domain}`
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`
}

/** 목록. 최신순. */
export async function listInquiries(limit = 100): Promise<InquiryListItem[] | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, created_at, company, name, email, phone, service_slug, status, intake_channel')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[admin] 문의 목록 조회 실패', { code: error.code, message: error.message })
    return null
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    company: String(row.company),
    name: String(row.name),
    serviceSlug: String(row.service_slug),
    status: String(row.status),
    intakeChannel: String(row.intake_channel),
    emailMasked: row.email ? maskEmail(String(row.email)) : null,
    phoneMasked: row.phone ? maskPhone(String(row.phone)) : null,
  }))
}

/** 상세. 없으면 `null`. */
export async function getInquiry(id: string): Promise<InquiryDetail | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('inquiries')
    .select(
      'id, created_at, company, name, email, phone, service_slug, message, status, privacy_consent, marketing_consent, source_path, handled_at, handled_by, intake_channel, created_by',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin] 문의 상세 조회 실패', { code: error.code, message: error.message })
    return null
  }
  if (!data) return null

  const email = data.email ? String(data.email) : null
  const phone = data.phone ? String(data.phone) : null

  return {
    id: String(data.id),
    createdAt: String(data.created_at),
    company: String(data.company),
    name: String(data.name),
    serviceSlug: String(data.service_slug),
    status: String(data.status),
    intakeChannel: String(data.intake_channel),
    emailMasked: email ? maskEmail(email) : null,
    phoneMasked: phone ? maskPhone(phone) : null,
    email,
    phone,
    message: String(data.message),
    privacyConsent: Boolean(data.privacy_consent),
    marketingConsent: Boolean(data.marketing_consent),
    sourcePath: data.source_path ? String(data.source_path) : null,
    handledAt: data.handled_at ? String(data.handled_at) : null,
    handledBy: data.handled_by ? String(data.handled_by) : null,
    createdBy: data.created_by ? String(data.created_by) : null,
  }
}
