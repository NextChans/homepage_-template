import Link from 'next/link'
import { serviceCountKo, services } from '@/content/services'
import { Reveal } from './reveal'
import { Container, Section } from './ui'

/**
 * 벤토 그리드. 첫 카드만 2열을 차지해 비대칭이되 균형을 유지한다.
 */

/** 마지막 행을 채우기 위한 span 클래스. Tailwind 가 스캔할 수 있도록 정적 문자열로 둔다. */
const SM_SPAN: Record<number, string> = { 2: 'sm:col-span-2' }
const LG_SPAN: Record<number, string> = { 2: 'lg:col-span-2', 3: 'lg:col-span-3' }

/**
 * 첫 카드는 2열, 마지막 카드는 남는 칸만큼 늘린다.
 *
 * ⚠️ 서비스 수가 바뀌면 마지막 행에 빈칸이 생긴다. 첫 카드가 2칸을 먹으므로
 *    마지막 카드 앞까지 채워진 칸 수는 정확히 `total` 이고, 남는 칸은
 *    `열 수 - (total % 열 수)` 다. 하드코딩하면 서비스를 추가할 때마다 깨진다.
 *    (실제로 5종 → 6종이 되면서 3열 마지막 행에 카드 1개 + 빈칸 2개가 생겼다)
 */
function cardSpan(index: number, total: number): string | undefined {
  if (index === 0) return 'sm:col-span-2'
  if (index !== total - 1) return undefined

  const classes = [SM_SPAN[2 - (total % 2)], LG_SPAN[3 - (total % 3)]].filter(
    (c): c is string => Boolean(c),
  )
  return classes.length > 0 ? classes.join(' ') : undefined
}

export function ServiceGrid() {
  return (
    <Section id="services">
      <Container>
        <div className="max-w-2xl">
          <Reveal as="p" className="type-eyebrow">
            서비스
          </Reveal>
          <Reveal as="h2" className="type-headline mt-4" delay={60}>
            {serviceCountKo} 개의 일.
            <br />
            하나의 창구.
          </Reveal>
          <Reveal as="p" className="type-body mt-6" delay={120}>
            단말기 한 대부터 전자금융업 등록까지. 결제 사업의 단계마다 필요한 일을 같은 팀이
            이어서 처리합니다.
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal
              key={s.slug}
              as="li"
              delay={i * 60}
              className={cardSpan(i, services.length)}
            >
              <Link
                href={`/services/${s.slug}`}
                className="group flex h-full flex-col justify-between rounded-squircle-lg border border-hairline bg-surface p-8 transition-[border-color,box-shadow,transform] duration-500 ease-[var(--ease-silk)] hover:-translate-y-0.5 hover:border-ink-muted/40 hover:shadow-lift sm:p-10"
              >
                <div>
                  <span className="text-[11px] font-medium tracking-[0.12em] text-ink-muted">
                    {s.mark}
                  </span>
                  <h3 className="type-title mt-5">{s.headline}</h3>
                  <p className="mt-3 text-[15px] font-medium text-ink">{s.name}</p>
                  <p className="type-body mt-4 text-[15px]">{s.summary}</p>
                </div>
                <span className="mt-8 inline-flex items-center gap-1 text-[14px] font-medium text-accent">
                  자세히 보기
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
  )
}
