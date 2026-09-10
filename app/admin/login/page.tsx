import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { LoginForm } from '@/components/admin/login-form'
import { Container } from '@/components/ui'
import { isAdminConfigured } from '@/lib/admin/auth'
import { getAdminSession } from '@/lib/admin/session'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: '관리자 로그인',
  // 관리자 화면은 색인되지 않아야 한다.
  robots: { index: false, follow: false, nocache: true },
}

/**
 * ⚠️ 반드시 동적이어야 한다.
 *
 * 이 페이지는 쿠키(세션)와 `ADMIN_*` 환경변수를 읽는다. 정적으로 프리렌더되면
 * **빌드 시점의 판단이 그대로 굳는다** — 빌드 환경에 자격증명이 없으면
 * `notFound()` 결과가 캐시되어, 런타임에 env 를 넣어도 영구히 404 가 된다.
 * (실제로 이 옵션 없이 빌드했을 때 `/admin/login` 이 Static 으로 잡혔다.)
 */
export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  // 자격증명 미설정 → 관리자 기능이 존재하지 않는다.
  if (!isAdminConfigured()) notFound()
  if (await getAdminSession()) redirect('/admin')

  return (
    <Container className="flex min-h-dvh items-center justify-center py-20">
      <div className="w-full max-w-sm">
        <p className="type-eyebrow text-center">{site.name} 관리자</p>
        <h1 className="type-title mt-3 text-center">상담 문의 조회</h1>
        <p className="type-body mt-3 text-center text-[14px]">
          접근 기록이 남습니다. 승인된 담당자만 로그인하세요.
        </p>

        <div className="mt-10 rounded-squircle-lg border border-hairline bg-surface p-8">
          <LoginForm />
        </div>
      </div>
    </Container>
  )
}
