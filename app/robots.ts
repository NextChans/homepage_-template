import type { MetadataRoute } from 'next'
import { features } from '@/content/features'
import { siteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin 은 항상 색인 제외. 자격증명 미설정 시에는 404 지만, 설정된 환경에서
    // 로그인 화면이 검색에 노출되면 정찰 대상이 된다.
    // /privacy 는 공개할 때만 제외 대상이 된다. 비공개면 404 라 규칙이 불필요하다.
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', ...(features.privacyPolicy ? ['/privacy'] : [])],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
