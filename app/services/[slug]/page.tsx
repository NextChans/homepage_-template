import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CtaBand } from '@/components/cta-band'
import { Faq } from '@/components/faq'
import { Hero } from '@/components/hero'
import { ProcessSteps } from '@/components/process-steps'
import { Reveal } from '@/components/reveal'
import { ButtonLink, Container, Section } from '@/components/ui'
import { serviceBySlug, services, type ServiceSlug } from '@/content/services'

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = serviceBySlug.get(slug as ServiceSlug)
  if (!service) return {}

  return {
    title: service.name,
    description: service.summary,
    openGraph: { title: `${service.name} — ${service.headline}`, description: service.summary },
  }
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params
  const service = serviceBySlug.get(slug as ServiceSlug)
  if (!service) notFound()

  return (
    <>
      <Hero
        size="headline"
        eyebrow={service.name}
        title={service.headline}
        lede={service.intro}
        actions={
          <>
            <ButtonLink href="/contact">상담 신청</ButtonLink>
            <ButtonLink href="/services" variant="secondary">
              전체 서비스
            </ButtonLink>
          </>
        }
        meta={`예상 소요 ${service.duration}`}
      />

      <Section className="border-t border-hairline">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <Reveal>
              <p className="type-eyebrow">해결하는 문제</p>
              <h2 className="type-title mt-4">여기서 막힙니다.</h2>
            </Reveal>
            <Reveal delay={60}>
              <ul className="divide-y divide-hairline border-y border-hairline">
                {service.problems.map((p) => (
                  <li key={p} className="py-6 text-[17px] leading-relaxed tracking-[-0.01em] text-ink">
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-hairline bg-surface">
        <Container>
          <div className="max-w-2xl">
            <Reveal as="p" className="type-eyebrow">
              산출물
            </Reveal>
            <Reveal as="h2" className="type-headline mt-4" delay={60}>
              말이 아니라
              <br />
              문서로 남습니다.
            </Reveal>
          </div>
          <ul className="mt-14 grid gap-4 sm:grid-cols-2">
            {service.deliverables.map((d, i) => (
              <Reveal
                as="li"
                key={d.title}
                delay={i * 60}
                className="rounded-squircle-lg border border-hairline bg-canvas p-8 sm:p-10"
              >
                <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{d.title}</h3>
                <p className="type-body mt-3 text-[15px]">{d.body}</p>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="border-t border-hairline">
        <Container>
          <div className="max-w-2xl">
            <Reveal as="p" className="type-eyebrow">
              진행 단계
            </Reveal>
            <Reveal as="h2" className="type-headline mt-4" delay={60}>
              {service.duration}.
            </Reveal>
            <Reveal as="p" className="type-body mt-6" delay={120}>
              실제 소요는 제출 서류의 완결성과 감독당국·기관의 검토 일정에 따라 달라질 수 있습니다.
            </Reveal>
          </div>
          <div className="mt-14">
            <ProcessSteps steps={service.process} />
          </div>
        </Container>
      </Section>

      <Section className="border-t border-hairline">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <Reveal>
              <p className="type-eyebrow">자주 묻는 질문</p>
              <h2 className="type-title mt-4">먼저 확인하세요.</h2>
            </Reveal>
            <Reveal delay={60}>
              <Faq items={service.faq} />
            </Reveal>
          </div>
        </Container>
      </Section>

      <CtaBand
        title={`${service.name}, 지금 시작할까요.`}
        body="현재 상황만 알려주시면 필요한 준비 항목과 일정을 정리해 회신드립니다."
      />
    </>
  )
}
