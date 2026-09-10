import { z } from 'zod'
import { services } from '@/content/services'

const serviceSlugs = services.map((s) => s.slug)

/** 서비스 선택값. 'other' 는 기타 문의. */
export const inquirySubjects = [...serviceSlugs, 'other'] as const

/**
 * 폼이 봇에게 채워지는 것을 막는 최소 장치.
 *  - honeypot: 사람에겐 보이지 않는 입력. 값이 있으면 봇.
 *  - startedAt: 폼 렌더 시각. 제출까지 MIN_FILL_MS 미만이면 봇으로 본다.
 */
export const MIN_FILL_MS = 2_000

/** 국내 전화/휴대폰. 하이픈·공백·국가번호를 허용하고 자릿수만 검증한다. */
const phonePattern = /^\+?[0-9][0-9\s-]{7,20}$/

export const inquirySchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(40, '이름이 너무 깁니다.'),
  company: z
    .string()
    .trim()
    .min(1, '회사명을 입력해 주세요.')
    .max(80, '회사명이 너무 깁니다.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('이메일 형식이 올바르지 않습니다.'))
    .refine((v) => v.length <= 160, '이메일이 너무 깁니다.'),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, '연락처 형식이 올바르지 않습니다.')
    .max(24, '연락처가 너무 깁니다.'),
  serviceSlug: z.enum(inquirySubjects, { message: '문의 분야를 선택해 주세요.' }),
  message: z
    .string()
    .trim()
    .min(10, '문의 내용을 10자 이상 입력해 주세요.')
    .max(2000, '문의 내용은 2000자까지 입력할 수 있습니다.'),
  privacyConsent: z.literal(true, { message: '개인정보 수집·이용에 동의해 주세요.' }),
  marketingConsent: z.boolean(),
})

export type InquiryInput = z.infer<typeof inquirySchema>

export type InquiryFieldErrors = Partial<Record<keyof InquiryInput, string>>

export type InquiryFormState = {
  status: 'idle' | 'success' | 'error'
  message: string
  fieldErrors: InquiryFieldErrors
}

export const initialInquiryFormState: InquiryFormState = {
  status: 'idle',
  message: '',
  fieldErrors: {},
}
