import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui'
import { auditContext, logAdminAction } from '@/lib/admin/audit'
import { AUDIT_ACTION_LABEL, auditActionLabel, listAuditLog } from '@/lib/admin/audit-read'
import { formatDateTime } from '@/lib/admin/format'
import { requirePermission } from '@/lib/admin/guard'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '감사 로그',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ action?: string }> }

/** 조회 기록이 대부분이라 필터가 없으면 계정 변경 이력이 묻힌다. */
const FILTERS: { key: string; label: string }[] = [
  { key: '', label: '전체' },
  { key: 'login_failed', label: '로그인 실패' },
  { key: 'record_viewed', label: '문의 상세 조회' },
  { key: 'record_created', label: '문의 등록' },
  { key: 'status_changed', label: '상태 변경' },
  { key: 'user_created', label: '계정 생성' },
  { key: 'user_role_changed', label: '권한 변경' },
  { key: 'user_password_reset', label: '비밀번호 초기화' },
  { key: 'sessions_revoked', label: '세션 만료' },
]

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const session = await requirePermission('audit.read')
  const { action } = await searchParams

  // ⚠️ 임의 문자열로 필터하지 못하게 알려진 액션만 허용한다.
  const filter = action && action in AUDIT_ACTION_LABEL ? action : undefined

  await logAdminAction({
    action: 'audit_viewed',
    actor: session.username,
    note: filter ? `filter=${filter}` : null,
    context: await auditContext(),
  })

  const entries = await listAuditLog({ action: filter })

  return (
    <Container className="py-12">
      <h1 className="type-title">감사 로그</h1>
      <p className="type-body mt-3 max-w-2xl text-[14px]">
        관리자 콘솔에서 일어난 일의 기록입니다. 최근 200건까지 보여줍니다.
        <b className="font-medium text-ink"> 이 화면을 연 것도 기록됩니다.</b>
      </p>
      <p className="mt-2 max-w-2xl text-[13px] text-ink-muted">
        문의 한 건의 처리 경과는 해당 문의 상세의 <b className="font-medium text-ink">처리 이력</b>{' '}
        에서 봅니다. 여기는 <b className="font-medium text-ink">누가 무엇을 했는지</b>의 기록입니다.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (filter ?? '') === f.key
          return (
            <Link
              key={f.key || 'all'}
              href={f.key ? `/admin/audit?action=${f.key}` : '/admin/audit'}
              className={
                active
                  ? 'rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white'
                  : 'rounded-full border border-hairline px-3.5 py-1.5 text-[12px] text-ink-muted transition-colors duration-300 hover:border-ink-muted hover:text-ink'
              }
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {!isSupabaseConfigured() ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          Supabase 환경변수가 설정되지 않아 감사 로그를 조회할 수 없습니다.
        </p>
      ) : entries === null ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          조회 중 오류가 발생했습니다. 서버 로그의 <code>[admin]</code> 항목을 확인하세요.
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          해당하는 기록이 없습니다.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hairline">
                {['시각', '행위', '수행자', '대상', '비고'].map((h) => (
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
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-hairline">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] tabular-nums text-ink-muted">
                    {formatDateTime(e.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink">
                    {auditActionLabel(e.action)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{e.actor ?? '—'}</td>
                  <td className="px-3 py-3">
                    {e.targetId ? (
                      <span className="font-mono text-[11px] text-ink-muted">{e.targetId}</span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="min-w-0 break-words px-3 py-3 text-ink-muted">{e.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  )
}
