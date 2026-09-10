'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/app/admin/actions'
import { initialLoginState } from '@/lib/admin/login-state'

const fieldClass =
  'w-full rounded-2xl border border-hairline bg-canvas px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-muted/70 transition-colors duration-300 focus:border-accent focus:outline-none'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-accent px-6 py-3.5 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? '확인 중…' : '로그인'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialLoginState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="admin-username" className="block text-[13px] font-medium text-ink">
          아이디
        </label>
        <input
          id="admin-username"
          name="username"
          autoComplete="username"
          required
          maxLength={80}
          className={`mt-2 ${fieldClass}`}
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="block text-[13px] font-medium text-ink">
          비밀번호
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className={`mt-2 ${fieldClass}`}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-[14px] text-accent">
          {state.error}
        </p>
      ) : null}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
