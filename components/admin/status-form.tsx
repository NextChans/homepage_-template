'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { changeInquiryStatus } from '@/app/admin/actions'
import { initialStatusChangeState } from '@/lib/admin/manual-inquiry-schema'
import { INQUIRY_STATUSES, STATUS_LABEL, type InquiryStatus } from '@/lib/admin/status'

const fieldClass =
  'w-full rounded-2xl border border-hairline bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted/70 transition-colors duration-300 focus:border-accent focus:outline-none'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? '변경 중…' : '상태 변경'}
    </button>
  )
}

export function StatusForm({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string
  currentStatus: InquiryStatus
}) {
  const [state, formAction] = useActionState(changeInquiryStatus, initialStatusChangeState)

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="inquiryId" value={inquiryId} />

      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div>
          <label htmlFor="sf-status" className="block text-[13px] font-medium text-ink">
            변경할 상태
          </label>
          <select
            id="sf-status"
            name="status"
            defaultValue={currentStatus}
            className={`mt-2 ${fieldClass}`}
          >
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor="sf-note" className="block text-[13px] font-medium text-ink">
            처리 메모 <span className="text-ink-muted">(선택)</span>
          </label>
          <input
            id="sf-note"
            name="note"
            maxLength={500}
            placeholder="예: 견적 발송, 다음 주 재연락"
            className={`mt-2 ${fieldClass}`}
          />
        </div>
      </div>

      <p className="text-[12px] text-ink-muted">
        변경 이력에 <strong className="font-medium text-ink">누가·언제·무엇에서 무엇으로</strong>{' '}
        바꿨는지 남습니다. 메모에 주민등록번호·계좌번호·카드번호를 적지 마세요.
      </p>

      {state.message ? (
        <p
          role="status"
          className={`text-[14px] ${state.status === 'error' ? 'text-accent' : 'text-ink'}`}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
