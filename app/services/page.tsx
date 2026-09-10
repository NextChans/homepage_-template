import type { Metadata } from 'next'
import Link from 'next/link'
import { CtaBand } from '@/components/cta-band'
import { Hero } from '@/components/hero'
import { Reveal } from '@/components/reveal'
import { Container, Section } from '@/components/ui'
import { services } from '@/content/services'

export const metadata: Metadata = {
  title: '서비스',
  description:
    '밴 단말기, PG 영업대행, 전자금융업 등록, 금융 클라우드 이용등록, 금융결제원 오픈뱅킹 연동. 결제 사업의 모든 단계를 지원합니다.',
}

export default function ServicesPage() {
  return (
    <>
      <Hero
        size="headline"
        eyebrow="서비스"
        title={
          <>
            필요한 건
            <br />
            절차가 아니라 결과입니다.
          </>
        }
        lede="다섯 개의 서비스는 따로 존재하지 않습니다. 사업 단계에 따라 필요한 것만, 순서대로 연결해 드립니다."
      />

      <Section className="border-t border-hairline pt-0 sm:pt-0 lg:pt-0">
        <Container>
          <ul className="divide-y divide-hairline">
            {services.map((s, i) => (
              <Reveal as="li" key={s.slug} delay={i * 50}>
                <Link
                  href={`/services/${s.slug}`}
                  className="group grid gap-6 py-12 sm:py-16 lg:grid-cols-[7rem_1fr_auto] lg:items-start lg:gap-12"
                >
                  <span className="text-[11px] font-medium tracking-[0.12em] text-ink-muted lg:pt-2">
                    {s.mark}
                  </span>

                  <div className="max-w-xl">
                    <h2 className="type-title">{s.headline}</h2>
                    <p className="mt-3 text-[15px] font-medium text-ink">{s.name}</p>
                    <p className="type-body mt-4">{s.summary}</p>
                    <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
                      <div className="flex gap-2">
                        <dt className="text-ink-muted">예상 소요</dt>
                        <dd className="text-ink">{s.duration}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-muted">산출물</dt>
                        <dd className="text-ink">{s.deliverables.length}종</dd>
                      </div>
                    </dl>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[15px] font-medium text-accent lg:pt-2">
                    자세히
                    <span
                      aria-hidden
                      className="transition-transform duration-300 ease-[var(--ease-silk)] group-hover:translate-x-0.5"
                    >
                      ›
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <CtaBand
        title="어떤 조합이 필요한지 모르겠다면."
        body="사업 모델만 알려주시면 필요한 서비스와 순서를 정리해 회신드립니다."
      />
    </>
  )
}
