'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createManualInquiry } from '@/app/admin/actions'
import { services } from '@/content/services'
import {
  CHANNEL_LABEL,
  INQUIRY_STATUSES,
  MANUAL_INTAKE_CHANNELS,
  STATUS_LABEL,
} from '@/lib/admin/status'
import { initialManualInquiryState } from '@/lib/admin/manual-inquiry-schema'

const fieldClass =
  'w-full rounded-2xl border border-hairline bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted/70 transition-colors duration-300 focus:border-accent focus:outline-none'

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
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
      className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? '등록 중…' : '문의 등록'}
    </button>
  )
}

export function ManualInquiryForm() {
  const [state, formAction] = useActionState(createManualInquiry, initialManualInquiryState)
  const err = state.fieldErrors

  return (
    <form action={formAction} className="mt-8 max-w-2xl space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="mi-channel" className="block text-[13px] font-medium text-ink">
            유입 경로 <span className="text-accent">*</span>
          </label>
          <select
            id="mi-channel"
            name="intakeChannel"
            required
            defaultValue="phone"
            aria-describedby={err.intakeChannel ? 'mi-channel-error' : undefined}
            className={`mt-2 ${fieldClass}`}
          >
            {MANUAL_INTAKE_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
          <FieldError id="mi-channel-error" message={err.intakeChannel} />
        </div>

        <div>
          <label htmlFor="mi-status" className="block text-[13px] font-medium text-ink">
            처리 상태 <span className="text-accent">*</span>
          </label>
          <select
            id="mi-status"
            name="status"
            required
            defaultValue="received"
            aria-describedby={err.status ? 'mi-status-error' : undefined}
            className={`mt-2 ${fieldClass}`}
          >
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[12px] text-ink-muted">
            이미 통화를 마친 건이면 &lsquo;연락 완료&rsquo; 로 등록하세요.
          </p>
          <FieldError id="mi-status-error" message={err.status} />
        </div>

        <div>
          <label htmlFor="mi-name" className="block text-[13px] font-medium text-ink">
            담당자 이름 <span className="text-accent">*</span>
          </label>
          <input
            id="mi-name"
            name="name"
            required
            maxLength={40}
            aria-describedby={err.name ? 'mi-name-error' : undefined}
            className={`mt-2 ${fieldClass}`}
          />
          <FieldError id="mi-name-error" message={err.name} />
        </div>

        <div>
          <label htmlFor="mi-company" className="block text-[13px] font-medium text-ink">
            회사명 <span className="text-accent">*</span>
          </label>
          <input
            id="mi-company"
            name="company"
            required
            maxLength={80}
            aria-describedby={err.company ? 'mi-company-error' : undefined}
            className={`mt-2 ${fieldClass}`}
          />
          <FieldError id="mi-company-error" message={err.company} />
        </div>

        <div>
          <label htmlFor="mi-phone" className="block text-[13px] font-medium text-ink">
            연락처
          </label>
          <input
            id="mi-phone"
            name="phone"
            inputMode="tel"
            maxLength={24}
            placeholder="02-0000-0000"
            aria-describedby={err.phone ? 'mi-phone-error' : undefined}
            className={`mt-2 ${fieldClass}`}
          />
          <FieldError id="mi-phone-error" message={err.phone} />
        </div>

        <div>
          <label htmlFor="mi-email" className="block text-[13px] font-medium text-ink">
            이메일
          </label>
          <input
            id="mi-email"
            name="email"
            type="email"
            maxLength={160}
            placeholder="name@company.co.kr"
            aria-describedby={err.email ? 'mi-email-error' : undefined}
            className={`mt-2 ${fieldClass}`}
          />
          <FieldError id="mi-email-error" message={err.email} />
        </div>
      </div>

      <p className="text-[12px] text-ink-muted">
        연락처와 이메일 중 <strong className="font-medium text-ink">하나는 반드시</strong>{' '}
        입력해야 합니다. 전화 문의는 이메일이 없을 수 있어 둘 다 선택 입력으로 두었습니다.
      </p>

      <div>
        <label htmlFor="mi-service" className="block text-[13px] font-medium text-ink">
          문의 분야 <span className="text-accent">*</span>
        </label>
        <select
          id="mi-service"
          name="serviceSlug"
          required
          defaultValue=""
          aria-describedby={err.serviceSlug ? 'mi-service-error' : undefined}
          className={`mt-2 ${fieldClass}`}
        >
          <option value="" disabled>
            선택하세요
          </option>
          {services.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
          <option value="other">기타</option>
        </select>
        <FieldError id="mi-service-error" message={err.serviceSlug} />
      </div>

      <div>
        <label htmlFor="mi-message" className="block text-[13px] font-medium text-ink">
          문의 내용 <span className="text-accent">*</span>
        </label>
        <textarea
          id="mi-message"
          name="message"
          required
          rows={6}
          minLength={10}
          maxLength={2000}
          placeholder="통화 내용을 요약해 적으세요. 10자 이상."
          aria-describedby={err.message ? 'mi-message-error' : undefined}
          className={`mt-2 ${fieldClass}`}
        />
        <FieldError id="mi-message-error" message={err.message} />
      </div>

      <div>
        <label htmlFor="mi-note" className="block text-[13px] font-medium text-ink">
          접수 메모 <span className="text-ink-muted">(선택)</span>
        </label>
        <input
          id="mi-note"
          name="note"
          maxLength={500}
          placeholder="예: 다음 주 화요일 재연락 요청"
          aria-describedby={err.note ? 'mi-note-error' : undefined}
          className={`mt-2 ${fieldClass}`}
        />
        <p className="mt-2 text-[12px] text-ink-muted">
          처리 이력에 함께 기록됩니다. 주민등록번호·계좌번호·카드번호는 적지 마세요.
        </p>
        <FieldError id="mi-note-error" message={err.note} />
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-hairline bg-surface p-5">
        <legend className="px-1 text-[13px] font-medium text-ink">동의 확인</legend>

        <label className="flex gap-3 text-[14px] text-ink">
          <input
            type="checkbox"
            name="privacyConsent"
            required
            className="mt-1 size-4 accent-accent"
          />
          <span>
            개인정보 수집·이용 동의를 <strong className="font-medium">받았습니다</strong>{' '}
            <span className="text-accent">*</span>
            <span className="mt-1 block text-[12px] text-ink-muted">
              통화·메일에서 구두 또는 서면으로 동의를 받은 경우에만 체크하세요. 동의 없이
              개인정보를 등록할 수 없습니다.
            </span>
          </span>
        </label>

        <label className="flex gap-3 text-[14px] text-ink">
          <input type="checkbox" name="marketingConsent" className="mt-1 size-4 accent-accent" />
          <span>마케팅 정보 수신에도 동의했습니다</span>
        </label>

        <FieldError id="mi-consent-error" message={err.privacyConsent} />
      </fieldset>

      {state.status === 'error' && state.message ? (
        <p role="alert" className="text-[14px] text-accent">
          {state.message}
          {err.form ? ` ${err.form}` : ''}
        </p>
      ) : null}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
