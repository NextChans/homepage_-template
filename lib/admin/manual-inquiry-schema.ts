import { z } from 'zod'
import { services } from '@/content/services'
import { INQUIRY_STATUSES, MANUAL_INTAKE_CHANNELS } from './status'

/**
 * 관리자가 직접 등록하는 문의의 검증 스키마.
 *
 * ⚠️ `lib/inquiry-schema.ts`(공개 폼)와 **일부러 분리했다.** 규칙이 다르다.
 *   - 공개 폼: 이메일·연락처 **둘 다 필수**, 봇 차단(honeypot·최소 작성시간) 필요,
 *     본인이 직접 동의를 체크한다.
 *   - 직접 등록: 전화 문의는 이메일이 없고 이메일 문의는 전화가 없다 →
 *     **둘 중 하나만 있어도 된다.** 봇 차단은 불필요(인증된 관리자).
 *     동의는 **관리자가 "동의를 받았음" 을 확인**하는 것이다.
 *   두 스키마를 하나로 합치면 어느 쪽 규칙인지 모호해지고, 공개 폼의 필수 조건을
 *   느슨하게 만드는 방향으로 새어 나간다.
 */

const serviceSlugs = services.map((s) => s.slug)
export const manualInquirySubjects = [...serviceSlugs, 'other'] as const

/** 국내 전화/휴대폰. 하이픈·공백·국가번호를 허용하고 자릿수만 검증한다. */
const phonePattern = /^\+?[0-9][0-9\s-]{7,20}$/

/** 빈 문자열을 `undefined` 로 바꾼다. 폼 미입력과 "값 없음" 을 같게 취급한다. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))

export const manualInquirySchema = z
  .object({
    name: z.string().trim().min(1, '담당자 이름을 입력해 주세요.').max(40, '이름이 너무 깁니다.'),
    company: z
      .string()
      .trim()
      .min(1, '회사명을 입력해 주세요.')
      .max(80, '회사명이 너무 깁니다.'),
    email: optionalText.pipe(
      z
        .string()
        .toLowerCase()
        .pipe(z.email('이메일 형식이 올바르지 않습니다.'))
        .refine((v) => v.length <= 160, '이메일이 너무 깁니다.')
        .optional(),
    ),
    phone: optionalText.pipe(
      z
        .string()
        .regex(phonePattern, '연락처 형식이 올바르지 않습니다.')
        .max(24, '연락처가 너무 깁니다.')
        .optional(),
    ),
    serviceSlug: z.enum(manualInquirySubjects, { message: '문의 분야를 선택해 주세요.' }),
    message: z
      .string()
      .trim()
      .min(10, '문의 내용을 10자 이상 입력해 주세요.')
      .max(2000, '문의 내용은 2000자까지 입력할 수 있습니다.'),
    intakeChannel: z.enum(MANUAL_INTAKE_CHANNELS as unknown as [string, ...string[]], {
      message: '유입 경로를 선택해 주세요.',
    }),
    status: z.enum(INQUIRY_STATUSES, { message: '처리 상태를 선택해 주세요.' }),
    // ⚠️ literal(true) — 동의 없이 개인정보를 등록하는 경로를 만들지 않는다.
    //    관리자가 "동의를 받았음" 을 확인하는 체크다. DB 의 check 제약과 짝을 이룬다.
    privacyConsent: z.literal(true, {
      message: '개인정보 수집·이용 동의를 받았는지 확인해 주세요.',
    }),
    marketingConsent: z.boolean(),
    note: optionalText.pipe(z.string().max(500, '메모는 500자까지 입력할 수 있습니다.').optional()),
  })
  // DB 의 inquiries_contact_present_check 와 같은 조건. 폼에서 먼저 걸러
  // 사용자에게 한국어로 알려준다.
  .refine((v) => Boolean(v.email ?? v.phone), {
    message: '이메일 또는 연락처 중 하나는 반드시 입력해야 합니다.',
    path: ['phone'],
  })

export type ManualInquiryInput = z.infer<typeof manualInquirySchema>

export type ManualInquiryFieldErrors = Partial<
  Record<keyof ManualInquiryInput | 'form', string>
>

export type ManualInquiryState = {
  status: 'idle' | 'error'
  message: string
  fieldErrors: ManualInquiryFieldErrors
}

export const initialManualInquiryState: ManualInquiryState = {
  status: 'idle',
  message: '',
  fieldErrors: {},
}

export type StatusChangeState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialStatusChangeState: StatusChangeState = {
  status: 'idle',
  message: '',
}
