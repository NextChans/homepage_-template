'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitInquiry } from '@/app/actions/inquiry'
import { initialInquiryFormState, type InquiryFieldErrors } from '@/lib/inquiry-schema'

type Option = { value: string; label: string }

const fieldClass =
  'w-full rounded-2xl border border-hairline bg-canvas px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-muted/70 transition-colors duration-300 focus:border-accent focus:outline-none'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-2 text-[13px] text-accent">
      {message}
    </p>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-accent px-7 py-3.5 text-[15px] font-medium text-white transition-colors duration-300 ease-[var(--ease-silk)] hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? '접수 중…' : '문의 보내기'}
    </button>
  )
}

export function ContactForm({
  options,
  defaultServiceSlug,
}: {
  options: readonly Option[]
  defaultServiceSlug?: string
}) {
  const [state, formAction] = useActionState(submitInquiry, initialInquiryFormState)
  const [startedAt, setStartedAt] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const uid = useId()

  // 폼 렌더 시각을 클라이언트에서 채운다(SSR 캐시된 값과 어긋나지 않도록 마운트 후 설정).
  useEffect(() => setStartedAt(String(Date.now())), [])

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state.status])

  const errors: InquiryFieldErrors = state.fieldErrors

  if (state.status === 'success') {
    return (
      <div className="rounded-squircle-lg border border-hairline bg-surface p-10 text-center sm:p-14">
        <p className="type-title">접수되었습니다.</p>
        <p className="type-body mx-auto mt-4 max-w-md">{state.message}</p>
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-6">
      <input type="hidden" name="startedAt" value={startedAt} />

      {/* honeypot — 사람에게는 보이지 않는다 */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input id={`${uid}-website`} name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className="block text-[13px] font-medium text-ink">
            담당자 이름
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            autoComplete="name"
            required
            maxLength={40}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${uid}-name-error` : undefined}
            className={`mt-2 ${fieldClass}`}
            placeholder="홍길동"
          />
          <FieldError id={`${uid}-name-error`} message={errors.name} />
        </div>

        <div>
          <label htmlFor={`${uid}-company`} className="block text-[13px] font-medium text-ink">
            회사명
          </label>
          <input
            id={`${uid}-company`}
            name="company"
            autoComplete="organization"
            required
            maxLength={80}
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? `${uid}-company-error` : undefined}
            className={`mt-2 ${fieldClass}`}
            placeholder="주식회사 예시"
          />
          <FieldError id={`${uid}-company-error`} message={errors.company} />
        </div>

        <div>
          <label htmlFor={`${uid}-email`} className="block text-[13px] font-medium text-ink">
            이메일
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={160}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${uid}-email-error` : undefined}
            className={`mt-2 ${fieldClass}`}
            placeholder="name@company.co.kr"
          />
          <FieldError id={`${uid}-email-error`} message={errors.email} />
        </div>

        <div>
          <label htmlFor={`${uid}-phone`} className="block text-[13px] font-medium text-ink">
            연락처
          </label>
          <input
            id={`${uid}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={24}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${uid}-phone-error` : undefined}
            className={`mt-2 ${fieldClass}`}
            placeholder="010-0000-0000"
          />
          <FieldError id={`${uid}-phone-error`} message={errors.phone} />
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-service`} className="block text-[13px] font-medium text-ink">
          문의 분야
        </label>
        <select
          id={`${uid}-service`}
          name="serviceSlug"
          defaultValue={defaultServiceSlug ?? ''}
          required
          aria-invalid={Boolean(errors.serviceSlug)}
          aria-describedby={errors.serviceSlug ? `${uid}-service-error` : undefined}
          className={`mt-2 appearance-none ${fieldClass}`}
        >
          <option value="" disabled>
            선택해 주세요
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldError id={`${uid}-service-error`} message={errors.serviceSlug} />
      </div>

      <div>
        <label htmlFor={`${uid}-message`} className="block text-[13px] font-medium text-ink">
          문의 내용
        </label>
        <textarea
          id={`${uid}-message`}
          name="message"
          rows={6}
          required
          minLength={10}
          maxLength={2000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${uid}-message-error` : undefined}
          className={`mt-2 resize-y ${fieldClass}`}
          placeholder="현재 사업 구조와 필요한 절차를 알려주세요. 예상 일정이 있다면 함께 적어주시면 좋습니다."
        />
        <p className="mt-2 text-[12px] text-ink-muted">
          주민등록번호, 계좌·카드번호 등 민감정보는 입력하지 마세요.
        </p>
        <FieldError id={`${uid}-message-error`} message={errors.message} />
      </div>

      <div className="space-y-3 rounded-2xl border border-hairline bg-surface p-5">
        <label className="flex items-start gap-3 text-[14px] text-ink">
          <input
            type="checkbox"
            name="privacyConsent"
            required
            aria-invalid={Boolean(errors.privacyConsent)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
          />
          <span>
            <strong className="font-medium">(필수)</strong> 상담 회신을 위한 개인정보 수집·이용에
            동의합니다.{' '}
            <a href="/privacy" className="text-accent underline-offset-2 hover:underline">
              처리방침 보기
            </a>
          </span>
        </label>
        <FieldError id={`${uid}-privacy-error`} message={errors.privacyConsent} />

        <label className="flex items-start gap-3 text-[14px] text-ink-muted">
          <input
            type="checkbox"
            name="marketingConsent"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
          />
          <span>(선택) 규제 변경 소식 등 정보성 메일 수신에 동의합니다.</span>
        </label>
      </div>

      {state.status === 'error' && state.message ? (
        <p role="alert" className="text-[14px] text-accent">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
