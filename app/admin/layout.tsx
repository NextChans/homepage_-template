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
                {/* 강제 변경 중에는 브랜드도 링크로 두지 않는다 — 눌러도 가드가
                    되돌려보내므로 "눌렀는데 아무 일도 안 난다" 로 읽힌다. */}
                {session.mustChangePassword ? (
                  <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                    {site.name} 관리자
                  </span>
                ) : (
                  <Link
                    href="/admin"
                    className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
                  >
                    {site.name} 관리자
                  </Link>
                )}
                {/* ⚠️ 초기 비밀번호 상태에서는 내비게이션을 숨긴다. 어느 링크를 눌러도
                    가드가 비밀번호 변경 화면으로 되돌려보내므로, 링크를 보여주면
                    "눌렀는데 아무 일도 안 난다" 로 읽혀 담당자를 혼란스럽게 한다. */}
                {session.mustChangePassword ? (
                  // 좁은 화면에서는 숨긴다 — 본문에 같은 내용이 크게 안내된다.
                  <span className="hidden text-[13px] text-ink-muted sm:inline">
                    비밀번호 변경 후 이용 가능
                  </span>
                ) : (
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
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden items-baseline gap-2 text-[13px] text-ink-muted sm:inline-flex">
                  {session.mustChangePassword ? (
                    <span>{session.username}</span>
                  ) : (
                    <Link href="/admin/password" className="transition-colors hover:text-ink">
                      {session.username}
                    </Link>
                  )}
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
