import { metrics } from '@/content/site'
import { Container } from './ui'
import { Reveal } from './reveal'

export function MetricsBand() {
  return (
    <div className="border-y border-hairline bg-surface">
      <Container className="py-14 sm:py-16">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <Reveal key={m.label} className="text-center" delay={i * 70}>
              <dt className="sr-only">{m.label}</dt>
              <dd>
                <span className="block text-[clamp(1.75rem,4.5vw,2.75rem)] font-semibold tracking-[-0.03em] text-ink">
                  {m.value}
                </span>
                <span className="mt-2 block text-[13px] text-ink-muted">{m.label}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </Container>
    </div>
  )
}
