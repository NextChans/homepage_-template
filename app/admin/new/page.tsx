import type { Metadata } from 'next'
import Link from 'next/link'
import { ManualInquiryForm } from '@/components/admin/manual-inquiry-form'
import { Container } from '@/components/ui'
import { requireAdminSession } from '@/lib/admin/guard'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '문의 직접 등록',
  robots: { index: false, follow: false, nocache: true },
}

/**
 * ⚠️ `force-dynamic` 이 없으면 Static 으로 프리렌더되고, 빌드 시점에는 `ADMIN_*`
 *    환경변수가 없으므로 그때의 `notFound()` 가 산출물에 굳어 **영구 404** 가 된다.
 *    관리자 라우트에는 전부 붙인다.
 */
export const dynamic = 'force-dynamic'

export default async function AdminNewInquiryPage() {
  await requireAdminSession()

  return (
    <Container className="py-12">
      <Link href="/admin" className="text-[13px] font-medium text-accent hover:text-accent-hover">
        ‹ 목록
      </Link>

      <h1 className="type-title mt-6">문의 직접 등록</h1>
      <p className="type-body mt-3 max-w-2xl text-[14px]">
        전화·이메일로 들어온 문의를 기록합니다. 등록과 동시에{' '}
        <b className="font-medium text-ink">처리 이력의 첫 줄</b>이 남고, 누가 등록했는지도 함께
        기록됩니다.
      </p>

      <div className="mt-6 max-w-2xl rounded-2xl border border-hairline bg-surface px-5 py-4 text-[13px] text-ink-muted">
        <b className="font-medium text-ink">개인정보를 저장하는 화면입니다.</b> 동의를 받지 않은
        연락처를 입력하지 마세요. 주민등록번호·계좌번호·카드번호는 어떤 항목에도 적지 않습니다.
        보관기간이 지난 문의는 삭제 대상입니다.
      </div>

      {!isSupabaseConfigured() ? (
        <p className="mt-8 max-w-2xl rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          Supabase 환경변수가 설정되지 않아 등록할 수 없습니다.
        </p>
      ) : (
        <ManualInquiryForm />
      )}
    </Container>
  )
}
