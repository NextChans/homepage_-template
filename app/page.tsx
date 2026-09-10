import { CtaBand } from '@/components/cta-band'
import { FeatureSplit, PanelStats } from '@/components/feature-split'
import { Hero } from '@/components/hero'
import { LogoStrip } from '@/components/logo-strip'
import { MetricsBand } from '@/components/metrics-band'
import { ProcessSteps } from '@/components/process-steps'
import { ServiceGrid } from '@/components/service-grid'
import { ButtonLink, Container, Section } from '@/components/ui'
import { Reveal } from '@/components/reveal'

const journey = [
  {
    step: '01',
    title: '진단',
    body: '자금 흐름과 결제 구조를 도식화해 필요한 등록과 연동을 특정합니다.',
  },
  { step: '02', title: '설계', body: '규제 요건과 기술 요건을 하나의 일정표로 합칩니다.' },
  { step: '03', title: '실행', body: '서류 제출과 개발, 검증을 병렬로 진행합니다.' },
  { step: '04', title: '운영', body: '오픈 후 정기 보고와 장애 대응 체계를 이관합니다.' },
] as const

export default function HomePage() {
  return (
    <>
      <Hero
        eyebrow="전자금융 인프라 파트너"
        title={
          <>
            복잡한 결제.
            <br />
            단순한 시작.
          </>
        }
        lede="단말기와 키오스크부터 전자금융업 등록, 금융 클라우드, 오픈뱅킹 연동까지. 흩어진 절차를 한 팀이 끝냅니다."
        actions={
          <>
            <ButtonLink href="/contact">상담 신청</ButtonLink>
            <ButtonLink href="/services" variant="secondary">
              서비스 살펴보기
            </ButtonLink>
          </>
        }
        meta="전화·이메일로 문의를 받습니다"
      />

      <MetricsBand />

      <ServiceGrid />

      <div className="border-t border-hairline">
        <FeatureSplit
          eyebrow="왜 한 팀인가"
          title={
            <>
              규제와 기술은
              <br />
              같은 일정 위에 있습니다.
            </>
          }
          body="등록은 법무, 연동은 개발. 따로 맡기면 일정이 어긋나고 오픈이 밀립니다. 요건 진단부터 검증까지 하나의 팀이 같은 계획표로 움직입니다."
          points={[
            '규제 요건과 개발 마일스톤을 단일 일정으로 관리',
            '보완 요청 발생 시 서류와 코드를 동시에 수정',
            '오픈 이후 정기 보고 주체까지 사전에 지정',
          ]}
          panel={
            <PanelStats
              // ⚠️ 근거 자료 확보 전까지 플레이스홀더. content/site.ts 의 metrics 주석 참고.
              rows={[
                { label: '평균 등록 소요', value: 'XX일' },
                { label: '보완 요청 대응', value: 'X영업일' },
                { label: '오픈 일정 준수율', value: 'XX%' },
              ]}
            />
          }
        />
      </div>

      <div className="border-t border-hairline">
        <FeatureSplit
          reverse
          eyebrow="정합성"
          title={
            <>
              돈이 오가는 시스템은
              <br />
              대조가 전부입니다.
            </>
          }
          body="승인과 정산, 원장이 어긋나는 순간이 사고의 시작입니다. 3자 대조 기준과 감사 로그 설계를 구축 단계에서 함께 넣습니다."
          points={[
            '카드사 – PG – 내부 원장 3자 정산 대조 기준 수립',
            '거래 단위 멱등키와 재시도 정책 정의',
            '감사 로그 보존 기간과 접근 권한 분리 설계',
          ]}
          panel={
            <PanelStats
              // ⚠️ 근거 자료 확보 전까지 플레이스홀더.
              rows={[
                { label: '일일 정산 대조', value: 'OO' },
                { label: '거래 로그 보존', value: 'X년' },
                { label: '장애 대응', value: 'OO' },
              ]}
            />
          }
        />
      </div>

      <Section className="border-t border-hairline">
        <Container>
          <div className="max-w-2xl">
            <Reveal as="p" className="type-eyebrow">
              진행 방식
            </Reveal>
            <Reveal as="h2" className="type-headline mt-4" delay={60}>
              네 단계.
              <br />
              그 이상은 없습니다.
            </Reveal>
          </div>
          <div className="mt-14">
            <ProcessSteps steps={journey} />
          </div>
        </Container>
      </Section>

      <div className="border-t border-hairline bg-surface">
        <LogoStrip />
      </div>

      <CtaBand />
    </>
  )
}
