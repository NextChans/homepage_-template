'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { changeMyPassword } from '@/app/admin/actions'
import {
  changeUserRole,
  createUser,
  deleteUser,
  resetPassword,
  revokeSessions,
  toggleUserStatus,
  unlockAccount,
} from '@/app/admin/users/actions'
import { ADMIN_ROLES, ROLE_DESCRIPTION, ROLE_LABEL, type AdminRole } from '@/lib/admin/roles'
import { PASSWORD_MIN_LENGTH, initialUserFormState } from '@/lib/admin/user-schema'

const fieldClass =
  'w-full rounded-2xl border border-hairline bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted/70 transition-colors duration-300 focus:border-accent focus:outline-none'

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-2 text-[13px] text-accent">
      {message}
    </p>
  )
}

function StateMessage({
  state,
}: {
  state: { status: 'idle' | 'success' | 'error'; message: string }
}) {
  if (!state.message) return null
  return (
    <p
      role="status"
      className={`text-[14px] ${state.status === 'error' ? 'text-accent' : 'text-ink'}`}
    >
      {state.message}
    </p>
  )
}

function Submit({ label, pendingLabel, danger }: { label: string; pendingLabel: string; danger?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        danger
          ? 'rounded-full border border-accent px-5 py-2.5 text-[14px] font-medium text-accent transition-colors duration-300 hover:bg-accent hover:text-white disabled:opacity-50'
          : 'rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover disabled:opacity-50'
      }
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

/** 비밀번호 + 확인 입력 한 쌍. 규칙을 한 곳에서만 안내한다. */
function PasswordPair({
  errors,
  idPrefix,
}: {
  errors: Record<string, string>
  idPrefix: string
}) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-pw`} className="block text-[13px] font-medium text-ink">
          비밀번호 <span className="text-accent">*</span>
        </label>
        <input
          id={`${idPrefix}-pw`}
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={200}
          autoComplete="new-password"
          className={`mt-2 ${fieldClass}`}
        />
        <p className="mt-2 text-[12px] text-ink-muted">
          {PASSWORD_MIN_LENGTH}자 이상. <b className="font-medium text-ink">앞뒤 공백은 거부됩니다</b> —
          붙여넣기 과정에서 공백이 따라오면 로그인이 되지 않습니다.
        </p>
        <FieldError message={errors.password} />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-pw2`} className="block text-[13px] font-medium text-ink">
          비밀번호 확인 <span className="text-accent">*</span>
        </label>
        <input
          id={`${idPrefix}-pw2`}
          name="passwordConfirm"
          type="password"
          required
          maxLength={200}
          autoComplete="new-password"
          className={`mt-2 ${fieldClass}`}
        />
        <FieldError message={errors.passwordConfirm} />
      </div>
    </>
  )
}

function RoleSelect({ defaultValue, error }: { defaultValue?: AdminRole; error?: string }) {
  return (
    <div>
      <label htmlFor="uf-role" className="block text-[13px] font-medium text-ink">
        권한 <span className="text-accent">*</span>
      </label>
      <select
        id="uf-role"
        name="role"
        required
        defaultValue={defaultValue ?? 'agent'}
        className={`mt-2 ${fieldClass}`}
      >
        {ADMIN_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]} — {ROLE_DESCRIPTION[r]}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  )
}

// ── 계정 생성 ───────────────────────────────────────────────────────────────

export function CreateUserForm() {
  const [state, action] = useActionState(createUser, initialUserFormState)
  return (
    <form action={action} className="mt-8 max-w-lg space-y-6">
      <div>
        <label htmlFor="uf-username" className="block text-[13px] font-medium text-ink">
          아이디 <span className="text-accent">*</span>
        </label>
        <input
          id="uf-username"
          name="username"
          required
          minLength={3}
          maxLength={40}
          autoComplete="off"
          placeholder="hong"
          className={`mt-2 ${fieldClass}`}
        />
        <p className="mt-2 text-[12px] text-ink-muted">
          영문 소문자·숫자·마침표·밑줄·하이픈. 만든 뒤에는 바꿀 수 없습니다.
        </p>
        <FieldError message={state.fieldErrors.username} />
      </div>

      <RoleSelect error={state.fieldErrors.role} />
      <PasswordPair errors={state.fieldErrors} idPrefix="uf" />

      <div className="rounded-2xl border border-hairline bg-surface px-5 py-4 text-[13px] text-ink-muted">
        여기서 정한 비밀번호는 <b className="font-medium text-ink">초기 비밀번호</b>입니다.
        해당 담당자는 첫 로그인에서 반드시 변경해야 합니다. 초기 비밀번호는 메신저 대신
        안전한 경로로 전달하세요.
      </div>

      <StateMessage state={state} />
      <Submit label="계정 생성" pendingLabel="생성 중…" />
    </form>
  )
}

// ── 권한 변경 ───────────────────────────────────────────────────────────────

export function RoleForm({ userId, currentRole }: { userId: string; currentRole: AdminRole }) {
  const [state, action] = useActionState(changeUserRole, initialUserFormState)
  return (
    <form action={action} className="mt-4 max-w-lg space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <RoleSelect defaultValue={currentRole} error={state.fieldErrors.role} />
      <p className="text-[12px] text-ink-muted">
        권한을 바꾸면 해당 계정의 <b className="font-medium text-ink">세션이 즉시 만료</b>됩니다.
        토큰에 담긴 역할이 낡은 값이 되기 때문입니다.
      </p>
      <StateMessage state={state} />
      <Submit label="권한 변경" pendingLabel="변경 중…" />
    </form>
  )
}

// ── 비밀번호 초기화 ─────────────────────────────────────────────────────────

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetPassword, initialUserFormState)
  return (
    <form action={action} className="mt-4 max-w-lg space-y-6">
      <input type="hidden" name="userId" value={userId} />
      <PasswordPair errors={state.fieldErrors} idPrefix="rp" />
      <p className="text-[12px] text-ink-muted">
        초기화하면 해당 계정의 세션이 만료되고, 첫 로그인에서 비밀번호 변경을 요구합니다.
      </p>
      <StateMessage state={state} />
      <Submit label="비밀번호 초기화" pendingLabel="초기화 중…" />
    </form>
  )
}

// ── 상태 · 세션 · 잠금 ──────────────────────────────────────────────────────

export function StatusForm({ userId, status }: { userId: string; status: 'active' | 'disabled' }) {
  const [state, action] = useActionState(toggleUserStatus, initialUserFormState)
  const next = status === 'active' ? 'disabled' : 'active'
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={next} />
      <StateMessage state={state} />
      <Submit
        label={next === 'disabled' ? '계정 비활성화' : '계정 활성화'}
        pendingLabel="처리 중…"
        danger={next === 'disabled'}
      />
    </form>
  )
}

export function RevokeSessionsForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(revokeSessions, initialUserFormState)
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <StateMessage state={state} />
      <Submit label="모든 세션 만료" pendingLabel="처리 중…" danger />
    </form>
  )
}

export function UnlockForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(unlockAccount, initialUserFormState)
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <StateMessage state={state} />
      <Submit label="잠금 해제" pendingLabel="처리 중…" />
    </form>
  )
}

// ── 계정 삭제 ───────────────────────────────────────────────────────────────

export function DeleteUserForm({ userId, username }: { userId: string; username: string }) {
  const [state, action] = useActionState(deleteUser, initialUserFormState)
  return (
    <form action={action} className="mt-4 max-w-lg space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <label htmlFor="du-confirm" className="block text-[13px] font-medium text-ink">
          확인을 위해 <code className="text-accent">{username}</code> 을 입력하세요
        </label>
        <input
          id="du-confirm"
          name="confirmUsername"
          required
          autoComplete="off"
          className={`mt-2 ${fieldClass}`}
        />
        <FieldError message={state.fieldErrors.confirmUsername} />
      </div>
      <p className="text-[12px] text-ink-muted">
        삭제는 되돌릴 수 없습니다. 처리 이력·감사 로그에 남은 계정명이 무엇을 가리키는지
        확인할 수 없게 됩니다. <b className="font-medium text-ink">비활성화를 먼저 검토하세요.</b>
      </p>
      <StateMessage state={state} />
      <Submit label="계정 삭제" pendingLabel="삭제 중…" danger />
    </form>
  )
}

// ── 본인 비밀번호 변경 ──────────────────────────────────────────────────────

export function OwnPasswordForm() {
  const [state, action] = useActionState(changeMyPassword, initialUserFormState)
  return (
    <form action={action} className="mt-8 max-w-lg space-y-6">
      <div>
        <label htmlFor="op-current" className="block text-[13px] font-medium text-ink">
          현재 비밀번호 <span className="text-accent">*</span>
        </label>
        <input
          id="op-current"
          name="currentPassword"
          type="password"
          required
          maxLength={200}
          autoComplete="current-password"
          className={`mt-2 ${fieldClass}`}
        />
        <FieldError message={state.fieldErrors.currentPassword} />
      </div>

      <PasswordPair errors={state.fieldErrors} idPrefix="op" />

      <p className="text-[12px] text-ink-muted">
        변경하면 <b className="font-medium text-ink">다른 기기의 세션이 모두 만료</b>됩니다.
        지금 쓰고 있는 브라우저는 계속 유지됩니다.
      </p>

      <StateMessage state={state} />
      <Submit label="비밀번호 변경" pendingLabel="변경 중…" />
    </form>
  )
}
