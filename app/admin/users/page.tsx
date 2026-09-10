import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui'
import { auditContext, logAdminAction } from '@/lib/admin/audit'
import { formatDateTime } from '@/lib/admin/format'
import { requirePermission } from '@/lib/admin/guard'
import { ROLE_LABEL } from '@/lib/admin/roles'
import { bootstrapUsername } from '@/lib/admin/auth'
import { listAdminUsers } from '@/lib/admin/users'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '계정 관리',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const session = await requirePermission('user.manage')
  await logAdminAction({
    action: 'user_list_viewed',
    actor: session.username,
    context: await auditContext(),
  })

  const users = await listAdminUsers()
  const bootstrap = bootstrapUsername()

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-title">계정 관리</h1>
        <Link
          href="/admin/users/new"
          className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
        >
          계정 추가
        </Link>
      </div>

      <p className="type-body mt-3 max-w-2xl text-[14px]">
        <b className="font-medium text-ink">관리자</b>는 문의 업무 전부와 계정 관리·감사 로그를,
        <b className="font-medium text-ink"> 상담자</b>는 문의 조회·직접 등록·상태 변경까지 할 수
        있습니다. 계정별로 로그인하면 처리 이력에 실제 담당자가 남습니다.
      </p>

      <div className="mt-6 max-w-2xl rounded-2xl border border-hairline bg-surface px-5 py-4 text-[13px] text-ink-muted">
        <b className="font-medium text-ink">비상 복구 계정</b>{' '}
        <code>{bootstrap || '(미설정)'}</code> 은 환경변수에 있어 이 목록에 나오지 않습니다.
        DB 계정이 모두 잠기거나 Supabase 장애 시의 마지막 경로이므로 일상 업무에 쓰지 마세요.
      </div>

      {!isSupabaseConfigured() ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          Supabase 환경변수가 설정되지 않아 계정을 조회할 수 없습니다.
        </p>
      ) : users === null ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          조회 중 오류가 발생했습니다. 마이그레이션(<code>admin_users</code>) 적용 여부와 서버
          로그의 <code>[admin]</code> 항목을 확인하세요.
        </p>
      ) : users.length === 0 ? (
        <div className="mt-8 rounded-squircle-lg border border-hairline bg-surface p-10 text-center">
          <p className="type-title">아직 계정이 없습니다.</p>
          <p className="type-body mx-auto mt-3 max-w-md text-[14px]">
            지금은 비상 복구 계정으로 들어와 있습니다. 실제 담당자 계정을 만들고, 이후 업무는
            개인 계정으로 하세요.
          </p>
          <Link
            href="/admin/users/new"
            className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
          >
            계정 추가
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hairline">
                {['아이디', '권한', '상태', '마지막 로그인', '실패', '생성', ''].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const locked = Boolean(u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now())
                return (
                  <tr key={u.id} className="border-b border-hairline">
                    <td className="px-3 py-3 font-medium text-ink">{u.username}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                      {ROLE_LABEL[u.role]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-ink">
                        {u.status === 'active' ? '활성' : '비활성'}
                      </span>
                      {locked ? (
                        <span className="ml-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-white">
                          잠김
                        </span>
                      ) : null}
                      {u.mustChangePassword ? (
                        <span className="ml-1.5 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-ink-muted">
                          변경 필요
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] tabular-nums text-ink-muted">
                      {formatDateTime(u.lastLoginAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] tabular-nums text-ink-muted">
                      {u.failedLoginCount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] tabular-nums text-ink-muted">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-[13px] font-medium text-accent hover:text-accent-hover"
                      >
                        관리
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  )
}
