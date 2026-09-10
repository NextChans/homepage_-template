import type { ReactNode } from 'react'
import { Container } from './ui'
import { Reveal } from './reveal'

type HeroProps = {
  eyebrow?: string
  title: ReactNode
  lede: ReactNode
  actions?: ReactNode
  /** 히어로 하단 보조 정보(소요기간 등) */
  meta?: ReactNode
  /**
   * 타이포 스케일. 홈은 'display'(최대 6rem), 하위 페이지는 'headline'(최대 3.5rem).
   * 한국어는 자폭이 넓어 display 스케일에서 두 줄 이상 깨지기 쉽다.
   */
  size?: 'display' | 'headline'
}

/**
 * 중앙 정렬 히어로. 압도적인 여백과 단 하나의 문장이 주인공이다.
 */
export function Hero({ eyebrow, title, lede, actions, meta, size = 'display' }: HeroProps) {
  const titleClass = size === 'display' ? 'type-display' : 'type-headline'
  const padding =
    size === 'display'
      ? 'pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36'
      : 'pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24'

  return (
    <section className={`${padding}`}>
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? (
            <Reveal as="p" className="type-eyebrow">
              {eyebrow}
            </Reveal>
          ) : null}
          <Reveal as="h1" className={`${titleClass} mt-4`} delay={60}>
            {title}
          </Reveal>
          <Reveal as="p" className="type-lede mx-auto mt-7 max-w-2xl" delay={120}>
            {lede}
          </Reveal>
          {actions ? (
            <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-3" delay={180}>
              {actions}
            </Reveal>
          ) : null}
          {meta ? (
            <Reveal as="p" className="mt-8 text-[13px] text-ink-muted" delay={220}>
              {meta}
            </Reveal>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
