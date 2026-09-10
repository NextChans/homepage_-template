import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { features } from '@/content/features'
import { site } from '@/content/site'
import { siteUrl } from '@/lib/site-url'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  /**
   * ⚠️ **정규 URL. 도메인을 붙인 뒤에도 `*.vercel.app` 은 계속 응답한다** —
   *    Vercel 이 자동 배정하는 주소는 제거할 수 없다. canonical 이 없으면 같은
   *    내용이 두 호스트로 색인되어 중복 콘텐츠가 된다.
   *
   * `'./'` 는 `metadataBase` 기준 **현재 경로**로 해석된다. 페이지마다 적지 않아도
   * `/services/kiosk` 는 `https://witus.kr/services/kiosk` 가 된다.
   * ⚠️ 절대 URL 을 박으면 **모든 페이지가 홈을 가리켜** 하위 페이지가 색인에서 사라진다.
   */
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    locale: site.locale,
    url: siteUrl,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* JS 미실행 환경에서 스크롤 리빌이 콘텐츠를 영구히 숨기지 않도록 방어한다. */}
        <noscript>
          <style>{'.reveal{opacity:1 !important;transform:none !important}'}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {/*
          Vercel Web Analytics. Vercel 대시보드 토글만으로는 수집되지 않고 이
          컴포넌트가 있어야 스크립트가 주입된다 — 둘 다 켜져야 동작한다.
          수집 항목과 남은 위험은 `content/features.ts` 의 `analytics` 주석에 있다.
        */}
        {features.analytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
