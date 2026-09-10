import type { Metadata } from 'next'
import Link from 'next/link'
import { CreateUserForm } from '@/components/admin/user-forms'
import { Container } from '@/components/ui'
import { requirePermission } from '@/lib/admin/guard'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '계정 추가',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function AdminNewUserPage() {
  await requirePermission('user.manage')

  return (
    <Container className="py-12">
      <Link
        href="/admin/users"
        className="text-[13px] font-medium text-accent hover:text-accent-hover"
      >
        ‹ 계정 관리
      </Link>
      <h1 className="type-title mt-6">계정 추가</h1>

      {!isSupabaseConfigured() ? (
        <p className="mt-8 max-w-lg rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          Supabase 환경변수가 설정되지 않아 계정을 만들 수 없습니다.
        </p>
      ) : (
        <CreateUserForm />
      )}
    </Container>
  )
}
