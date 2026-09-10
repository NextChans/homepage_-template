import type { Metadata } from 'next'
import Link from 'next/link'
import { OwnPasswordForm } from '@/components/admin/user-forms'
import { Container } from '@/components/ui'
import { requireSessionAllowingPasswordChange } from '@/lib/admin/guard'

export const metadata: Metadata = {
  title: '비밀번호 변경',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function AdminPasswordPage() {
  // ⚠️ 일반 가드를 쓰면 mustChangePassword 상태에서 이 화면이 자신으로
  //    리다이렉트되어 무한 루프가 된다.
  const session = await requireSessionAllowingPasswordChange()

  return (
    <Container className="py-12">
      {!session.mustChangePassword ? (
        <Link href="/admin" className="text-[13px] font-medium text-accent hover:text-accent-hover">
          ‹ 문의
        </Link>
      ) : null}

      <h1 className="type-title mt-6">비밀번호 변경</h1>

      {session.mustChangePassword ? (
        <p className="mt-3 max-w-lg rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink">
          <b className="font-medium">초기 비밀번호로 로그인했습니다.</b> 비밀번호를 변경해야 다른
          화면을 이용할 수 있습니다.
        </p>
      ) : null}

      {session.isBootstrap ? (
        <p className="mt-3 max-w-lg rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          지금은 <b className="font-medium text-ink">비상 복구 계정</b>으로 로그인해 있습니다.
          이 계정의 비밀번호는 환경변수(<code>ADMIN_PASSWORD_HASH</code>)에 있어 여기서 바꿀 수
          없습니다. Vercel 에서 값을 교체하고 재배포하세요.
        </p>
      ) : (
        <OwnPasswordForm />
      )}
    </Container>
  )
}
