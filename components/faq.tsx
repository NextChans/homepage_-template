import { Reveal } from './reveal'

export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-hairline border-y border-hairline">
      {items.map((item, i) => (
        <Reveal key={item.q} delay={i * 50}>
          <details className="group py-6">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[17px] font-medium tracking-[-0.01em] text-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden
                className="mt-1 shrink-0 text-ink-muted transition-transform duration-300 ease-[var(--ease-silk)] group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="type-body mt-4 max-w-2xl text-[15px]">{item.a}</p>
          </details>
        </Reveal>
      ))}
    </div>
  )
}
