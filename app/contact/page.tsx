import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact-form'
import { Hero } from '@/components/hero'
import { Reveal } from '@/components/reveal'
import { ButtonAnchor, Container, Section } from '@/components/ui'
import { features } from '@/content/features'
import { services } from '@/content/services'
import { company } from '@/content/site'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '문의',
  description: features.inquiryForm
    ? '결제 인프라 구축과 전자금융 규제 대응 상담을 접수합니다. 1영업일 내 회신드립니다.'
    : '결제 인프라 구축과 전자금융 규제 대응 상담. 전화 또는 이메일로 문의해 주세요.',
}

const options = [
  ...services.map((s) => ({ value: s.slug, label: s.name })),
  { value: 'other', label: '기타 문의' },
] as const

type PageProps = { searchParams: Promise<{ service?: string }> }

/** 연락 수단 목록. 폼이 있든 없든 항상 보여준다. */
function ContactDetails() {
  return (
    <dl className="space-y-6 text-[15px]">
      <div>
        <dt className="text-[13px] text-ink-muted">전화</dt>
        <dd className="mt-1">
          <a href={`tel:${company.tel.replace(/-/g, '')}`} className="text-ink hover:text-accent">
            {company.tel}
          </a>
        </dd>
      </div>
      <div>
        <dt className="text-[13px] text-ink-muted">이메일</dt>
        <dd className="mt-1">
          <a href={`mailto:${company.email}`} className="text-ink hover:text-accent">
            {company.email}
          </a>
        </dd>
      </div>
      <div>
        <dt className="text-[13px] text-ink-muted">운영시간</dt>
        <dd className="mt-1 text-ink">{company.hours}</dd>
      </div>
      <div>
        <dt className="text-[13px] text-ink-muted">주소</dt>
        <dd className="mt-1 text-ink">{company.address}</dd>
      </div>
    </dl>
  )
}

export default async function ContactPage({ searchParams }: PageProps) {
  // 폼이 꺼져 있으면 searchParams(문의 분야 프리셋)를 쓸 일이 없다.
  const requested = features.inquiryForm ? (await searchParams).service : undefined
  const preset = options.find((o) => o.value === requested)?.value

  // ── 폼 비활성 상태: 전화·이메일 안내만 ────────────────────────────
  if (!features.inquiryForm) {
    return (
      <>
        <Hero
          size="headline"
          eyebrow="문의"
          title="전화 한 통이면 됩니다."
          lede="현재 온라인 상담 접수는 준비 중입니다. 전화 또는 이메일로 연락 주시면 담당자가 직접 안내드립니다."
        />

        <Section className="border-t border-hairline pt-16 sm:pt-20 lg:pt-24">
          <Container>
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <h2 className="type-title">연락처</h2>
                <div className="mt-8">
                  <ContactDetails />
                </div>
                <div className="mt-10 flex flex-wrap gap-3">
                  <ButtonAnchor href={`tel:${company.tel.replace(/-/g, '')}`} variant="primary">
                    전화 걸기
                  </ButtonAnchor>
                  <ButtonAnchor href={`mailto:${company.email}`}>이메일 보내기</ButtonAnchor>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h2 className="type-title">이렇게 알려주시면 빠릅니다</h2>
                <ul className="mt-8 space-y-3">
                  {[
                    '어떤 업종인지, 어떤 결제 방식이 필요한지',
                    '전자금융업 등록·오픈뱅킹 연동 등 이미 진행한 절차가 있는지',
                    '오픈 목표 시점',
                  ].map((line) => (
                    <li key={line} className="flex gap-3 text-[15px] text-ink">
                      <span aria-hidden className="mt-px shrink-0 text-accent">
                        —
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="type-body mt-8 text-[15px]">
                  위 세 가지만 알려주셔도 필요한 절차와 순서를 정리해 회신드릴 수 있습니다.
                </p>
              </Reveal>
            </div>
          </Container>
        </Section>
      </>
    )
  }

  // ── 폼 활성 상태 ──────────────────────────────────────────────────
  //
  // ⚠️ 알려진 비용: 플래그가 꺼져 있어도 이 폼의 클라이언트 JS(약 32kB)가
  //    /contact 방문자에게 내려간다. 플래그 타입이 `boolean` 이라 번들러가
  //    제거하지 못하고(이유는 content/features.ts), 서버 컴포넌트에서
  //    `await import()` 로 바꿔도 Next 의 클라이언트 참조 그래프에 남아 효과가 없다.
  //    **보안상 문제는 아니다** — 쓰기 경로는 Server Action 의 플래그 검사로 막혀 있다.
  //    번들에서 완전히 떼어내려면 라우트를 분리해야 하는데, 재활성화 비용이 커져
  //    현재는 이 비용을 감수한다. 자세한 판단은 doc/04-decisions.md ADR-014.
  const supabaseNotice = !isSupabaseConfigured() && process.env.NODE_ENV !== 'production'

  return (
    <>
      <Hero
        size="headline"
        eyebrow="문의"
        title="한 번만 적으면 됩니다."
        lede="현재 상황과 목표만 알려주세요. 필요한 절차와 순서, 예상 일정을 정리해 회신드립니다."
        meta="첫 회신까지 평균 1영업일"
      />

      <Section className="border-t border-hairline pt-16 sm:pt-20 lg:pt-24">
        <Container>
          <div className="grid gap-16 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
            <Reveal>
              <h2 className="type-title">직접 연락도 좋습니다.</h2>
              <div className="mt-8">
                <ContactDetails />
              </div>
            </Reveal>

            <Reveal delay={80}>
              {supabaseNotice ? (
                <p className="mb-6 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[13px] text-ink-muted">
                  개발 안내: Supabase 환경변수가 설정되지 않아 접수가 저장되지 않습니다.{' '}
                  <code className="text-ink">.env.local</code> 을 확인하세요. 이 안내는 개발
                  환경에서만 표시됩니다.
                </p>
              ) : null}
              <ContactForm options={options} defaultServiceSlug={preset} />
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  )
}
