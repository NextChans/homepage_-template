import { Reveal } from './reveal'

type Step = { step: string; title: string; body: string }

export function ProcessSteps({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-squircle-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <Reveal as="li" key={s.step} delay={i * 60} className="bg-canvas p-8">
          <span className="text-[11px] font-medium tracking-[0.12em] text-ink-muted">{s.step}</span>
          <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">{s.title}</h3>
          <p className="type-body mt-3 text-[15px]">{s.body}</p>
        </Reveal>
      ))}
    </ol>
  )
}
