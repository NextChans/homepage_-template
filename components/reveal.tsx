'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  /** 순차 등장 지연(ms). 과하면 산만해지므로 120ms 이하 권장. */
  delay?: number
}

/**
 * 스크롤 리빌. IntersectionObserver 한 번만 발화(once)한다.
 * prefers-reduced-motion 은 globals.css 에서 transition 을 제거해 즉시 표시된다.
 */
export function Reveal({ children, as: Tag = 'div', className = '', delay = 0 }: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      el.dataset.shown = 'true'
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const target = entry.target as HTMLElement
          window.setTimeout(() => {
            target.dataset.shown = 'true'
          }, delay)
          observer.unobserve(target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <Tag ref={ref} data-shown="false" className={`reveal ${className}`}>
      {children}
    </Tag>
  )
}
