import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui'
import { services } from '@/content/services'
import { auditContext, logAdminAction } from '@/lib/admin/audit'
import { requireAdminSession } from '@/lib/admin/guard'
import { getInquiry } from '@/lib/admin/inquiries'

export const metadata: Metadata = {
  title: '문의 상세',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

const serviceLabel = new Map<string, string>([
  ...services.map((s) => [s.slug, s.name] as [string, string]),
  ['other', '기타 문의'],
])

const statusLabel: Record<string, string> = {
  received: '접수',
  in_review: '검토 중',
  contacted: '연락 완료',
  closed: '종료',
  spam: '스팸',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** UUID 형식만 허용한다. 임의 문자열로 조회를 시도하지 못하게 한다. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-4 sm:flex-row sm:gap-8">
      <dt className="w-40 shrink-0 text-[13px] text-ink-muted">{label}</dt>
      <dd className="text-[15px] text-ink">{children}</dd>
    </div>
  )
}

export default async function AdminInquiryDetailPage({ params }: PageProps) {
  const session = await requireAdminSession()
  const { id } = await params

  if (!UUID_RE.test(id)) notFound()

  const inquiry = await getInquiry(id)
  if (!inquiry) notFound()

  // 개인정보 전체를 열람한 시점을 기록한다. 목록 조회와 구분해 남긴다.
  const context = await auditContext()
  await logAdminAction({
    action: 'record_viewed',
    actor: session.username,
    targetId: inquiry.id,
    context,
  })

  return (
    <Container className="py-12">
      <Link href="/admin" className="text-[13px] font-medium text-accent hover:text-accent-hover">
        ‹ 목록
      </Link>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-title">{inquiry.company}</h1>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] text-ink">
          {statusLabel[inquiry.status] ?? inquiry.status}
        </span>
      </div>

      <p className="mt-3 rounded-2xl border border-hairline bg-surface px-5 py-3 text-[13px] text-ink-muted">
        이 화면에는 개인정보 전체가 표시됩니다. 열람 사실이 감사 로그에 기록되었습니다.
        화면 캡처·외부 공유를 하지 마세요.
      </p>

      <dl className="mt-8 max-w-3xl border-t border-hairline">
        <Row label="접수일시">
          <span className="font-mono tabular-nums">{formatDate(inquiry.createdAt)}</span>
        </Row>
        <Row label="담당자">{inquiry.name}</Row>
        <Row label="이메일">
          <a href={`mailto:${inquiry.email}`} className="font-mono text-accent hover:underline">
            {inquiry.email}
          </a>
        </Row>
        <Row label="연락처">
          <a
            href={`tel:${inquiry.phone.replace(/[^0-9+]/g, '')}`}
            className="font-mono text-accent hover:underline"
          >
            {inquiry.phone}
          </a>
        </Row>
        <Row label="문의 분야">{serviceLabel.get(inquiry.serviceSlug) ?? inquiry.serviceSlug}</Row>
        <Row label="문의 내용">
          <span className="whitespace-pre-wrap leading-relaxed">{inquiry.message}</span>
        </Row>
        <Row label="개인정보 수집 동의">{inquiry.privacyConsent ? '동의' : '미동의'}</Row>
        <Row label="마케팅 수신 동의">{inquiry.marketingConsent ? '동의' : '미동의'}</Row>
        <Row label="유입 경로">
          <span className="font-mono text-[13px] text-ink-muted">
            {inquiry.sourcePath ?? '—'}
          </span>
        </Row>
        <Row label="처리 담당">{inquiry.handledBy ?? '—'}</Row>
        <Row label="처리 일시">
          <span className="font-mono tabular-nums">{formatDate(inquiry.handledAt)}</span>
        </Row>
        <Row label="레코드 id">
          <span className="font-mono text-[12px] text-ink-muted">{inquiry.id}</span>
        </Row>
      </dl>

      <p className="mt-8 max-w-3xl text-[13px] text-ink-muted">
        이 화면은 <b className="font-medium text-ink">읽기 전용</b>입니다. 처리 상태 변경은
        아직 구현되지 않았습니다 — Supabase 대시보드에서 <code>status</code> ·{' '}
        <code>handled_by</code> · <code>handled_at</code> 을 직접 수정하세요.
      </p>
    </Container>
  )
}
