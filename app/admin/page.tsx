import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui'
import { services } from '@/content/services'
import { auditContext, logAdminAction } from '@/lib/admin/audit'
import { formatDateTime } from '@/lib/admin/format'
import { requireAdminSession } from '@/lib/admin/guard'
import { listInquiries } from '@/lib/admin/inquiries'
import { CHANNEL_LABEL, STATUS_LABEL, isInquiryStatus, isIntakeChannel } from '@/lib/admin/status'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '상담 문의',
  robots: { index: false, follow: false, nocache: true },
}

/** 관리자 화면은 절대 캐시하지 않는다. */
export const dynamic = 'force-dynamic'

const serviceLabel = new Map<string, string>([
  ...services.map((s) => [s.slug, s.name] as [string, string]),
  ['other', '기타 문의'],
])

export default async function AdminInquiriesPage() {
  const session = await requireAdminSession()
  const context = await auditContext()
  await logAdminAction({ action: 'list_viewed', actor: session.username, context })

  const rows = await listInquiries()

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-title">상담 문의</h1>
        <div className="flex items-center gap-4">
          <p className="font-mono text-[12px] text-ink-muted">
            {rows === null ? '조회 실패' : `${rows.length}건`}
          </p>
          <Link
            href="/admin/new"
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
          >
            직접 등록
          </Link>
        </div>
      </div>

      <p className="type-body mt-3 text-[14px]">
        목록에서는 이메일·연락처를 마스킹합니다. 전체 값은 상세에서 확인하세요.
        전화·이메일로 받은 문의는 <b className="font-medium text-ink">직접 등록</b>으로 남기세요.
        <b className="font-medium text-ink"> 모든 조회는 감사 로그에 기록됩니다.</b>
      </p>

      {!isSupabaseConfigured() ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          Supabase 환경변수가 설정되지 않아 문의를 조회할 수 없습니다.
        </p>
      ) : rows === null ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          조회 중 오류가 발생했습니다. 서버 로그의 <code>[admin]</code> 항목을 확인하세요.
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-squircle-lg border border-hairline bg-surface p-10 text-center">
          <p className="type-title">아직 접수된 문의가 없습니다.</p>
          <p className="type-body mx-auto mt-3 max-w-md text-[14px]">
            현재 홈페이지 상담 폼이 비활성 상태입니다(<code>content/features.ts</code>).
            전화·이메일로 받은 문의는 <b className="font-medium text-ink">직접 등록</b>으로
            이력을 남길 수 있습니다.
          </p>
          <Link
            href="/admin/new"
            className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
          >
            직접 등록
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hairline">
                {[
                  '접수일시',
                  '경로',
                  '회사',
                  '담당자',
                  '분야',
                  '이메일',
                  '연락처',
                  '상태',
                  '',
                ].map((h) => (
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
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-hairline">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] tabular-nums text-ink-muted">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                    {isIntakeChannel(row.intakeChannel)
                      ? CHANNEL_LABEL[row.intakeChannel]
                      : row.intakeChannel}
                  </td>
                  <td className="px-3 py-3 text-ink">{row.company}</td>
                  <td className="px-3 py-3 text-ink">{row.name}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                    {serviceLabel.get(row.serviceSlug) ?? row.serviceSlug}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-ink-muted">
                    {row.emailMasked ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-ink-muted">
                    {row.phoneMasked ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-ink">
                      {isInquiryStatus(row.status) ? STATUS_LABEL[row.status] : row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <Link
                      href={`/admin/${row.id}`}
                      className="text-[13px] font-medium text-accent hover:text-accent-hover"
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  )
}
