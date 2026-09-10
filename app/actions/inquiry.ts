'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import {
  MIN_FILL_MS,
  inquirySchema,
  type InquiryFieldErrors,
  type InquiryFormState,
} from '@/lib/inquiry-schema'
import { getServiceClient, supabaseConfigHint } from '@/lib/supabase/server'

/** 동일 IP 해시 기준 레이트리밋 */
const RATE_LIMIT_WINDOW_MINUTES = 10
const RATE_LIMIT_MAX = 3

function clientIp(headerList: Headers): string | null {
  // 프록시/CDN 환경에 따라 헤더가 다르다. 우선순위대로 확인한다.
  const forwarded = headerList.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headerList.get('x-real-ip') ?? headerList.get('cf-connecting-ip')
}

/**
 * IP 원문을 저장하지 않기 위한 해시. salt 가 없으면 해시 자체를 남기지 않는다
 * (salt 없는 IP 해시는 사실상 원문과 동일하게 재식별 가능하므로).
 */
function hashIp(ip: string | null): string | null {
  const salt = process.env.INQUIRY_IP_HASH_SALT
  if (!ip || !salt) return null
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

function fail(message: string, fieldErrors: InquiryFieldErrors = {}): InquiryFormState {
  return { status: 'error', message, fieldErrors }
}

export async function submitInquiry(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  // ── 1. 봇 차단 (honeypot + 최소 작성 시간) ──────────────────────────────
  if (String(formData.get('company_website') ?? '').length > 0) {
    // 봇에게는 성공처럼 보이게 응답한다(정보 노출 최소화).
    return { status: 'success', message: '문의가 접수되었습니다.', fieldErrors: {} }
  }

  const startedAt = Number(formData.get('startedAt') ?? 0)
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) {
    return fail('잠시 후 다시 시도해 주세요.')
  }

  // ── 2. 입력 검증 ────────────────────────────────────────────────────────
  const parsed = inquirySchema.safeParse({
    name: formData.get('name'),
    company: formData.get('company'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    serviceSlug: formData.get('serviceSlug'),
    message: formData.get('message'),
    privacyConsent: formData.get('privacyConsent') === 'on',
    marketingConsent: formData.get('marketingConsent') === 'on',
  })

  if (!parsed.success) {
    const fieldErrors: InquiryFieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !(key in fieldErrors)) {
        fieldErrors[key as keyof InquiryFieldErrors] = issue.message
      }
    }
    return fail('입력값을 확인해 주세요.', fieldErrors)
  }

  // ── 3. 저장소 확인 ──────────────────────────────────────────────────────
  const supabase = getServiceClient()
  if (!supabase) {
    console.error(supabaseConfigHint())
    return fail('일시적인 오류로 접수가 지연되고 있습니다. 전화로 문의해 주세요.')
  }

  const headerList = await headers()
  const ipHash = hashIp(clientIp(headerList))
  const userAgent = headerList.get('user-agent')?.slice(0, 512) ?? null

  // ── 4. 레이트리밋 ───────────────────────────────────────────────────────
  if (ipHash) {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString()
    const { count, error } = await supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)

    if (error) {
      // 카운트 실패는 접수를 막지 않는다(가용성 우선). 다만 반드시 남긴다.
      console.error('[inquiry] rate limit 조회 실패', error.message)
    } else if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return fail(
        `${RATE_LIMIT_WINDOW_MINUTES}분 내 문의 가능 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.`,
      )
    }
  }

  // ── 5. 저장 ─────────────────────────────────────────────────────────────
  const input = parsed.data
  const { error } = await supabase.from('inquiries').insert({
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    service_slug: input.serviceSlug,
    message: input.message,
    privacy_consent: input.privacyConsent,
    marketing_consent: input.marketingConsent,
    source_path: headerList.get('referer'),
    ip_hash: ipHash,
    user_agent: userAgent,
  })

  if (error) {
    // 개인정보가 로그에 남지 않도록 입력값은 절대 출력하지 않는다.
    console.error('[inquiry] insert 실패', { code: error.code, message: error.message })
    return fail('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  }

  return {
    status: 'success',
    message: '문의가 접수되었습니다. 1영업일 내 회신드립니다.',
    fieldErrors: {},
  }
}
