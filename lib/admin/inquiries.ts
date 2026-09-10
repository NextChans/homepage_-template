import 'server-only'

import { getServiceClient } from '@/lib/supabase/server'

/**
 * 관리자 화면용 문의 조회. **읽기 전용이다.**
 *
 * 상태 변경(`status` / `handled_at` / `handled_by`)은 스키마에 준비되어 있지만
 * 이번 범위에 넣지 않았다 — 요청은 "조회" 였고, 쓰기 경로를 추가하면 공격면이
 * 늘어난다. 관리자 화면을 읽기 전용으로 두는 편이 안전하다. (ADR-015)
 */

export type InquiryListItem = {
  id: string
  createdAt: string
  company: string
  name: string
  serviceSlug: string
  status: string
  /** 마스킹된 값. 목록에서는 전체 값을 노출하지 않는다. */
  emailMasked: string
  phoneMasked: string
}

export type InquiryDetail = InquiryListItem & {
  email: string
  phone: string
  message: string
  privacyConsent: boolean
  marketingConsent: boolean
  sourcePath: string | null
  handledAt: string | null
  handledBy: string | null
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
    .select('id, created_at, company, name, email, phone, service_slug, status')
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
    emailMasked: maskEmail(String(row.email)),
    phoneMasked: maskPhone(String(row.phone)),
  }))
}

/** 상세. 없으면 `null`. */
export async function getInquiry(id: string): Promise<InquiryDetail | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('inquiries')
    .select(
      'id, created_at, company, name, email, phone, service_slug, message, status, privacy_consent, marketing_consent, source_path, handled_at, handled_by',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin] 문의 상세 조회 실패', { code: error.code, message: error.message })
    return null
  }
  if (!data) return null

  const email = String(data.email)
  const phone = String(data.phone)

  return {
    id: String(data.id),
    createdAt: String(data.created_at),
    company: String(data.company),
    name: String(data.name),
    serviceSlug: String(data.service_slug),
    status: String(data.status),
    emailMasked: maskEmail(email),
    phoneMasked: maskPhone(phone),
    email,
    phone,
    message: String(data.message),
    privacyConsent: Boolean(data.privacy_consent),
    marketingConsent: Boolean(data.marketing_consent),
    sourcePath: data.source_path ? String(data.source_path) : null,
    handledAt: data.handled_at ? String(data.handled_at) : null,
    handledBy: data.handled_by ? String(data.handled_by) : null,
  }
}
