import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui'
import { services } from '@/content/services'
import { auditContext, logAdminAction } from '@/lib/admin/audit'
import { formatDateTime } from '@/lib/admin/format'
import { requireAdminSession } from '@/lib/admin/guard'
import { getInquiry } from '@/lib/admin/inquiries'
import { listStatusHistory } from '@/lib/admin/inquiry-write'
import { CHANNEL_LABEL, STATUS_LABEL, isInquiryStatus, isIntakeChannel } from '@/lib/admin/status'
import { StatusForm } from '@/components/admin/status-form'

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

/** UUID 형식만 허용한다. 임의 문자열로 조회를 시도하지 못하게 한다. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 라벨 + 값 한 줄.
 *
 * ⚠️ `<dd>` 에 `min-w-0` 이 **반드시** 있어야 한다. flex 아이템의 기본
 *    `min-width: auto` 는 아이템이 내용의 최소 폭보다 작아지는 것을 막으므로,
 *    긴 문의 본문이 컨테이너를 밀어내 **화면 밖으로 넘친다.**
 *    `whitespace-pre-wrap` 만으로는 해결되지 않는다(줄바꿈 기회가 있어도
 *    아이템 자체가 줄어들지 않는다). 실제로 이 증상으로 신고를 받았다.
 *    `break-words` 는 공백 없는 긴 문자열(URL 등)까지 끊어준다.
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-4 sm:flex-row sm:gap-8">
      <dt className="w-40 shrink-0 text-[13px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-[15px] text-ink">{children}</dd>
    </div>
  )
}

export default async function AdminInquiryDetailPage({ params }: PageProps) {
  const session = await requireAdminSession()
  const { id } = await params

  if (!UUID_RE.test(id)) notFound()

  const inquiry = await getInquiry(id)
  if (!inquiry) notFound()

  const history = await listStatusHistory(inquiry.id)

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
          {isInquiryStatus(inquiry.status) ? STATUS_LABEL[inquiry.status] : inquiry.status}
        </span>
      </div>

      <p className="mt-3 rounded-2xl border border-hairline bg-surface px-5 py-3 text-[13px] text-ink-muted">
        이 화면에는 개인정보 전체가 표시됩니다. 열람 사실이 감사 로그에 기록되었습니다.
        화면 캡처·외부 공유를 하지 마세요.
      </p>

      <dl className="mt-8 max-w-3xl border-t border-hairline">
        <Row label="접수일시">
          <span className="font-mono tabular-nums">{formatDateTime(inquiry.createdAt)}</span>
        </Row>
        <Row label="담당자">{inquiry.name}</Row>
        <Row label="이메일">
          {inquiry.email ? (
            <a href={`mailto:${inquiry.email}`} className="font-mono text-accent hover:underline">
              {inquiry.email}
            </a>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </Row>
        <Row label="연락처">
          {inquiry.phone ? (
            <a
              href={`tel:${inquiry.phone.replace(/[^0-9+]/g, '')}`}
              className="font-mono text-accent hover:underline"
            >
              {inquiry.phone}
            </a>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </Row>
        <Row label="문의 분야">{serviceLabel.get(inquiry.serviceSlug) ?? inquiry.serviceSlug}</Row>
        <Row label="문의 내용">
          <span className="whitespace-pre-wrap leading-relaxed">{inquiry.message}</span>
        </Row>
        <Row label="개인정보 수집 동의">{inquiry.privacyConsent ? '동의' : '미동의'}</Row>
        <Row label="마케팅 수신 동의">{inquiry.marketingConsent ? '동의' : '미동의'}</Row>
        <Row label="유입 경로">
          {isIntakeChannel(inquiry.intakeChannel)
            ? CHANNEL_LABEL[inquiry.intakeChannel]
            : inquiry.intakeChannel}
          {inquiry.sourcePath ? (
            <span className="ml-2 font-mono text-[13px] text-ink-muted">{inquiry.sourcePath}</span>
          ) : null}
        </Row>
        <Row label="등록자">
          {inquiry.createdBy ?? <span className="text-ink-muted">— (홈페이지 폼)</span>}
        </Row>
        <Row label="처리 담당">{inquiry.handledBy ?? '—'}</Row>
        <Row label="처리 일시">
          <span className="font-mono tabular-nums">{formatDateTime(inquiry.handledAt)}</span>
        </Row>
        <Row label="레코드 id">
          <span className="font-mono text-[12px] text-ink-muted">{inquiry.id}</span>
        </Row>
      </dl>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-[15px] font-medium text-ink">처리 상태 변경</h2>
        <StatusForm
          inquiryId={inquiry.id}
          currentStatus={isInquiryStatus(inquiry.status) ? inquiry.status : 'received'}
        />
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-[15px] font-medium text-ink">처리 이력</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            이력이 없습니다. 이 문의는 이력 기능 추가 이전에 접수되었습니다.
          </p>
        ) : (
          <ol className="mt-4 border-t border-hairline">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-1 border-b border-hairline py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[13px] tabular-nums text-ink-muted">
                    {formatDateTime(h.changedAt)}
                  </span>
                  <span className="text-[14px] text-ink">
                    {h.fromStatus ? (
                      <>
                        {isInquiryStatus(h.fromStatus) ? STATUS_LABEL[h.fromStatus] : h.fromStatus}
                        <span className="mx-1.5 text-ink-muted">→</span>
                      </>
                    ) : (
                      <span className="mr-1.5 text-ink-muted">접수 등록</span>
                    )}
                    <b className="font-medium">
                      {isInquiryStatus(h.toStatus) ? STATUS_LABEL[h.toStatus] : h.toStatus}
                    </b>
                  </span>
                  <span className="text-[13px] text-ink-muted">{h.changedBy}</span>
                </div>
                {h.note ? (
                  <p className="min-w-0 break-words whitespace-pre-wrap text-[13px] text-ink-muted">
                    {h.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-10 max-w-3xl text-[13px] text-ink-muted">
        문의 내용·연락처 <b className="font-medium text-ink">수정과 삭제는 이 화면에서 할 수
        없습니다.</b> 접수된 원문을 임의로 바꾸면 처리 이력의 근거가 사라집니다. 정정이 필요하면
        Supabase 대시보드에서 처리하고 사유를 남기세요.
      </p>
    </Container>
  )
}
