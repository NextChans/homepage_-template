import type { ReactNode } from 'react'
import { Reveal } from './reveal'
import { Container } from './ui'

type FeatureSplitProps = {
  eyebrow: string
  title: ReactNode
  body: ReactNode
  points?: readonly string[]
  /** 시각 패널에 들어갈 내용. 장식이 아니라 정보여야 한다. */
  panel: ReactNode
  /** true 면 패널이 왼쪽으로 간다. */
  reverse?: boolean
}

export function FeatureSplit({
  eyebrow,
  title,
  body,
  points,
  panel,
  reverse = false,
}: FeatureSplitProps) {
  return (
    <Container className="py-20 sm:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className={reverse ? 'lg:order-2' : undefined}>
          <p className="type-eyebrow">{eyebrow}</p>
          <h2 className="type-title mt-4 max-w-md">{title}</h2>
          <p className="type-body mt-5 max-w-md">{body}</p>
          {points ? (
            <ul className="mt-8 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] text-ink">
                  <span aria-hidden className="mt-px shrink-0 text-accent">
                    —
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>

        <Reveal
          delay={80}
          className={`rounded-squircle-lg border border-hairline bg-surface p-10 shadow-lift sm:p-12 ${
            reverse ? 'lg:order-1' : ''
          }`}
        >
          {panel}
        </Reveal>
      </div>
    </Container>
  )
}

/** 패널용 정보 테이블. 수치는 크게, 라벨은 작게. */
export function PanelStats({
  rows,
}: {
  rows: readonly { value: string; label: string }[]
}) {
  return (
    <dl className="divide-y divide-hairline">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-6 py-5 first:pt-0 last:pb-0">
          <dt className="text-[14px] text-ink-muted">{r.label}</dt>
          <dd className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
