'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { nav, site } from '@/content/site'
import { BrandMark } from './brand-mark'
import { Container } from './ui'

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // 경로가 바뀌면 모바일 메뉴를 닫는다.
  useEffect(() => setOpen(false), [pathname])

  // 메뉴가 열려 있는 동안 배경 스크롤 잠금.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <header className="glass sticky top-0 z-50 border-b border-hairline">
      <Container>
        <div className="flex h-12 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-ink"
            aria-label={`${site.name} 홈`}
          >
            {/* 심볼은 `currentColor` — 부모의 `text-ink` 를 물려받는다. 골드를 쓰지
                않는다(팔레트 (A)안). 근거는 `content/brand.ts` 주석. */}
            <BrandMark className="h-[19px] w-auto" />
            {site.name}
            <span className="text-[11px] font-medium tracking-[0.08em] text-ink-muted">
              {site.nameKo}
            </span>
          </Link>

          <nav aria-label="주요 메뉴" className="hidden items-center gap-9 sm:flex">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`text-[13px] transition-colors duration-300 hover:text-ink ${
                    active ? 'text-ink' : 'text-ink-muted'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <Link
              href="/contact"
              className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
            >
              상담 신청
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="-mr-2 flex h-10 w-10 items-center justify-center sm:hidden"
          >
            <span className="sr-only">메뉴 {open ? '닫기' : '열기'}</span>
            <span aria-hidden className="relative block h-3 w-4">
              <span
                className={`absolute left-0 block h-[1.5px] w-4 bg-ink transition-transform duration-300 ease-[var(--ease-silk)] ${
                  open ? 'top-[5.5px] rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 block h-[1.5px] w-4 bg-ink transition-transform duration-300 ease-[var(--ease-silk)] ${
                  open ? 'top-[5.5px] -rotate-45' : 'top-[11px]'
                }`}
              />
            </span>
          </button>
        </div>
      </Container>

      {open ? (
        <div id="mobile-menu" className="border-t border-hairline bg-canvas sm:hidden">
          <Container>
            <nav aria-label="모바일 메뉴" className="flex flex-col py-4">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-3 text-[22px] font-semibold tracking-[-0.02em] text-ink"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/contact"
                className="mt-4 rounded-full bg-accent px-6 py-3 text-center text-[15px] font-medium text-white"
              >
                상담 신청
              </Link>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  )
}
