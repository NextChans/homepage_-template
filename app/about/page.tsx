import type { Metadata } from 'next'
import { CtaBand } from '@/components/cta-band'
import { Hero } from '@/components/hero'
import { MetricsBand } from '@/components/metrics-band'
import { Reveal } from '@/components/reveal'
import { Container, Section } from '@/components/ui'
import { company, site } from '@/content/site'

export const metadata: Metadata = {
  title: '회사소개',
  description: `${site.legalName} 는 결제 인프라 구축과 전자금융 규제 대응을 함께 수행하는 팀입니다.`,
}

/** ⚠️ 임시 문안. 실제 연혁·조직 정보로 교체할 것. */
const principles = [
  {
    title: '먼저 줄입니다.',
    body: '필요 없는 절차를 덜어내는 것이 먼저입니다. 등록해야 할 것과 하지 않아도 되는 것을 명확히 구분해 드립니다.',
  },
  {
    title: '문서로 남깁니다.',
    body: '구두 자문은 흔적이 없습니다. 판단의 근거와 전제를 문서로 남겨, 담당자가 바뀌어도 이어갈 수 있게 합니다.',
  },
  {
    title: '오픈 후를 봅니다.',
    body: '등록과 연동은 시작입니다. 정기 보고, 정산 대조, 장애 대응까지 운영 체계를 함께 넘겨드립니다.',
  },
]

const history = [
  { year: '2026', body: '오픈뱅킹 이용기관 연동 프로젝트 다수 수행' },
  { year: '2025', body: '금융 클라우드 이용등록 컨설팅 라인 신설' },
  { year: '2024', body: '전자금융업 등록 컨설팅 본격화' },
  { year: '2023', body: 'VAN 단말 공급 및 PG 영업대행 사업 시작' },
]

export default function AboutPage() {
  return (
    <>
      <Hero
        size="headline"
        eyebrow="회사소개"
        title={
          <>
            규제를 아는
            <br />
            엔지니어링 팀.
          </>
        }
        lede={`${site.legalName} 는 결제 인프라 구축과 전자금융 규제 대응을 한 팀에서 수행합니다. 법무와 개발 사이에서 일정이 끊기지 않게 만드는 것이 우리의 일입니다.`}
      />

      <MetricsBand />

      <Section>
        <Container>
          <div className="max-w-2xl">
            <Reveal as="p" className="type-eyebrow">
              일하는 방식
            </Reveal>
            <Reveal as="h2" className="type-headline mt-4" delay={60}>
              세 가지 원칙.
            </Reveal>
          </div>
          <ul className="mt-14 grid gap-4 lg:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal
                as="li"
                key={p.title}
                delay={i * 70}
                className="rounded-squircle-lg border border-hairline bg-surface p-8 sm:p-10"
              >
                <h3 className="type-title">{p.title}</h3>
                <p className="type-body mt-4 text-[15px]">{p.body}</p>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="border-t border-hairline">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <Reveal>
              <p className="type-eyebrow">연혁</p>
              <h2 className="type-title mt-4">지나온 길.</h2>
              <p className="type-body mt-5 text-[15px]">
                아래 연혁은 템플릿용 임시 데이터입니다.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <ol className="divide-y divide-hairline border-y border-hairline">
                {history.map((h) => (
                  <li key={h.year} className="flex gap-8 py-6">
                    <span className="w-14 shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-ink">
                      {h.year}
                    </span>
                    <span className="text-[15px] leading-relaxed text-ink-muted">{h.body}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-hairline">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <Reveal>
              <p className="type-eyebrow">회사 정보</p>
              <h2 className="type-title mt-4">사업자 정보.</h2>
            </Reveal>
            <Reveal delay={60}>
              <dl className="divide-y divide-hairline border-y border-hairline text-[15px]">
                {[
                  ['상호', site.legalName],
                  ['대표', company.ceo],
                  ['사업자등록번호', company.bizNo],
                  ['주소', company.address],
                  ['전화', company.tel],
                  ['이메일', company.email],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-8 py-5">
                    <dt className="w-32 shrink-0 text-ink-muted">{label}</dt>
                    <dd className="text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </Container>
      </Section>

      <CtaBand />
    </>
  )
}
