import Link from 'next/link'
import { company, nav, site } from '@/content/site'
import { services } from '@/content/services'
import { Container } from './ui'

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-surface">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[13px] font-semibold text-ink">서비스</p>
            <ul className="mt-4 space-y-2.5">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-[13px] text-ink-muted transition-colors duration-300 hover:text-ink"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">회사</p>
            <ul className="mt-4 space-y-2.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-ink-muted transition-colors duration-300 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/privacy"
                  className="text-[13px] text-ink-muted transition-colors duration-300 hover:text-ink"
                >
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-[13px] font-semibold text-ink">문의</p>
            <dl className="mt-4 space-y-2.5 text-[13px] text-ink-muted">
              <div className="flex gap-3">
                <dt className="w-14 shrink-0">전화</dt>
                <dd>
                  <a href={`tel:${company.tel.replace(/-/g, '')}`} className="hover:text-ink">
                    {company.tel}
                  </a>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-14 shrink-0">이메일</dt>
                <dd>
                  <a href={`mailto:${company.email}`} className="hover:text-ink">
                    {company.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-14 shrink-0">운영시간</dt>
                <dd>{company.hours}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-12 border-t border-hairline pt-8">
          <p className="text-[12px] leading-relaxed text-ink-muted">
            {company.address} · {site.legalName} · 대표 {company.ceo} · 사업자등록번호{' '}
            {company.bizNo}
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            개인정보 보호책임자 {company.privacyOfficer}
          </p>
          <p className="mt-4 text-[12px] text-ink-muted">
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          <p className="mt-4 text-[12px] leading-relaxed text-ink-muted/80">
            본 사이트는 템플릿 예시입니다. 게재된 회사 정보·수치·서비스 설명은 임시 데이터이며 실제
            계약 조건이나 규제 자문 의견을 구성하지 않습니다.
          </p>
        </div>
      </Container>
    </footer>
  )
}
