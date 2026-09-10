import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  DeleteUserForm,
  ResetPasswordForm,
  RevokeSessionsForm,
  RoleForm,
  StatusForm,
  UnlockForm,
} from '@/components/admin/user-forms'
import { Container } from '@/components/ui'
import { formatDateTime } from '@/lib/admin/format'
import { requirePermission } from '@/lib/admin/guard'
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/admin/roles'
import { ACCOUNT_LOCK_MAX_FAILURES, ACCOUNT_LOCK_MINUTES, getAdminUser } from '@/lib/admin/users'

export const metadata: Metadata = {
  title: '계정 상세',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-4 sm:flex-row sm:gap-8">
      <dt className="w-40 shrink-0 text-[13px] text-ink-muted">{label}</dt>
      {/* min-w-0: flex 아이템의 기본 min-width:auto 때문에 긴 값이 화면을 넘어간다 */}
      <dd className="min-w-0 break-words text-[15px] text-ink">{children}</dd>
    </div>
  )
}

function Section({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 max-w-2xl">
      <h2 className="text-[15px] font-medium text-ink">{title}</h2>
      {lead ? <p className="mt-2 text-[13px] text-ink-muted">{lead}</p> : null}
      {children}
    </section>
  )
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const session = await requirePermission('user.manage')
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const user = await getAdminUser(id)
  if (!user) notFound()

  const isSelf = session.userId === user.id
  const locked = Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now())

  return (
    <Container className="py-12">
      <Link
        href="/admin/users"
        className="text-[13px] font-medium text-accent hover:text-accent-hover"
      >
        ‹ 계정 관리
      </Link>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-title">{user.username}</h1>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] text-ink">
          {ROLE_LABEL[user.role]}
        </span>
      </div>

      {isSelf ? (
        <p className="mt-3 max-w-2xl rounded-2xl border border-hairline bg-surface px-5 py-3 text-[13px] text-ink-muted">
          본인 계정입니다. <b className="font-medium text-ink">권한 변경·비활성화·삭제는 할 수
          없습니다</b> — 실수로 자신의 접근 권한을 잃으면 되돌릴 방법이 없습니다. 비밀번호는{' '}
          <Link href="/admin/password" className="text-accent hover:underline">
            비밀번호 변경
          </Link>{' '}
          화면에서 바꾸세요.
        </p>
      ) : null}

      <dl className="mt-8 max-w-2xl border-t border-hairline">
        <Row label="권한">
          {ROLE_LABEL[user.role]}
          <span className="ml-2 text-[13px] text-ink-muted">{ROLE_DESCRIPTION[user.role]}</span>
        </Row>
        <Row label="상태">{user.status === 'active' ? '활성' : '비활성'}</Row>
        <Row label="비밀번호 변경 필요">{user.mustChangePassword ? '예' : '아니오'}</Row>
        <Row label="마지막 로그인">
          <span className="font-mono tabular-nums">{formatDateTime(user.lastLoginAt)}</span>
        </Row>
        <Row label="비밀번호 변경일">
          <span className="font-mono tabular-nums">{formatDateTime(user.passwordChangedAt)}</span>
        </Row>
        <Row label="로그인 실패">
          <span className="font-mono tabular-nums">{user.failedLoginCount}</span>
          {locked ? (
            <span className="ml-2 text-accent">
              잠김 — {formatDateTime(user.lockedUntil)} 까지
            </span>
          ) : null}
        </Row>
        <Row label="생성">
          <span className="font-mono tabular-nums">{formatDateTime(user.createdAt)}</span>
          {user.createdBy ? (
            <span className="ml-2 text-[13px] text-ink-muted">by {user.createdBy}</span>
          ) : null}
        </Row>
        {user.status === 'disabled' ? (
          <Row label="비활성화">
            <span className="font-mono tabular-nums">{formatDateTime(user.disabledAt)}</span>
            {user.disabledBy ? (
              <span className="ml-2 text-[13px] text-ink-muted">by {user.disabledBy}</span>
            ) : null}
          </Row>
        ) : null}
        <Row label="계정 id">
          <span className="font-mono text-[12px] text-ink-muted">{user.id}</span>
        </Row>
      </dl>

      {!isSelf ? (
        <Section title="권한 변경">
          <RoleForm userId={user.id} currentRole={user.role} />
        </Section>
      ) : null}

      <Section
        title="비밀번호 초기화"
        lead="담당자가 비밀번호를 잊었을 때 사용합니다. 초기화 후 첫 로그인에서 변경을 요구합니다."
      >
        <ResetPasswordForm userId={user.id} />
      </Section>

      <Section
        title="세션 강제 만료"
        lead="계정 유출이 의심되거나 공용 PC 에 로그인이 남았을 때 모든 세션을 즉시 끊습니다."
      >
        <RevokeSessionsForm userId={user.id} />
      </Section>

      {locked ? (
        <Section
          title="로그인 잠금 해제"
          lead={`${ACCOUNT_LOCK_MINUTES}분 내 ${ACCOUNT_LOCK_MAX_FAILURES}회 실패로 잠겼습니다. 본인 실수임이 확인되면 해제하세요.`}
        >
          <UnlockForm userId={user.id} />
        </Section>
      ) : null}

      {!isSelf ? (
        <>
          <Section
            title={user.status === 'active' ? '계정 비활성화' : '계정 활성화'}
            lead={
              user.status === 'active'
                ? '로그인을 막고 세션도 즉시 만료시킵니다. 삭제보다 이 방법을 먼저 쓰세요 — 처리 이력에 남은 계정명을 해석할 수 있게 유지됩니다.'
                : '다시 로그인할 수 있게 합니다. 로그인 실패 횟수와 잠금도 초기화됩니다.'
            }
          >
            <StatusForm userId={user.id} status={user.status} />
          </Section>

          <Section title="계정 삭제" lead="되돌릴 수 없습니다. 비활성화를 먼저 검토하세요.">
            <DeleteUserForm userId={user.id} username={user.username} />
          </Section>
        </>
      ) : null}
    </Container>
  )
}
