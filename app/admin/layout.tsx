import Link from 'next/link'
import { logout } from './actions'
import { Container } from '@/components/ui'
import { ROLE_LABEL, can } from '@/lib/admin/roles'
import { getAdminSession } from '@/lib/admin/session'
import { site } from '@/content/site'

/** 관리자 영역은 어떤 경우에도 캐시하지 않는다. 쿠키(세션)를 읽는다. */
export const dynamic = 'force-dynamic'

/**
 * 관리자 영역 셸.
 *
 * ⚠️ **여기서 세션을 검사하지 않는다.** App Router 의 레이아웃은 클라이언트 측
 *    네비게이션에서 매번 재실행된다고 보장되지 않으므로 인가 지점으로 부적절하다.
 *    각 페이지가 `requireAdminSession()` 을 직접 호출한다. 레이아웃은 껍데기만 담당한다.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()

  return (
    <div className="min-h-dvh bg-canvas">
      {session ? (
        <header className="border-b border-hairline bg-surface">
          <Container>
            <div className="flex h-14 items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <Link href="/admin" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  {site.name} 관리자
                </Link>
                <nav className="flex items-center gap-3 text-[13px]">
                  <Link href="/admin" className="text-ink-muted transition-colors hover:text-ink">
                    문의
                  </Link>
                  {can(session.role, 'user.manage') ? (
                    <Link
                      href="/admin/users"
                      className="text-ink-muted transition-colors hover:text-ink"
                    >
                      계정
                    </Link>
                  ) : null}
                  {can(session.role, 'audit.read') ? (
                    <Link
                      href="/admin/audit"
                      className="text-ink-muted transition-colors hover:text-ink"
                    >
                      감사 로그
                    </Link>
                  ) : null}
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden items-baseline gap-2 text-[13px] text-ink-muted sm:inline-flex">
                  <Link href="/admin/password" className="transition-colors hover:text-ink">
                    {session.username}
                  </Link>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink">
                    {ROLE_LABEL[session.role]}
                  </span>
                  {/* 비상 복구 계정으로 들어와 있다는 사실을 화면에 계속 보여준다.
                      일상 업무를 이 계정으로 하고 있으면 즉시 알아차려야 한다. */}
                  {session.isBootstrap ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                      비상 복구 계정
                    </span>
                  ) : null}
                </span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors duration-300 hover:border-ink-muted hover:text-ink"
                  >
                    로그아웃
                  </button>
                </form>
              </div>
            </div>
          </Container>
        </header>
      ) : null}
      {children}
    </div>
  )
}
