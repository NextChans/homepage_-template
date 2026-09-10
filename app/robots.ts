import type { MetadataRoute } from 'next'
import { features } from '@/content/features'
import { siteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    // /privacy 는 공개할 때만 색인 제외 대상이 된다. 비공개면 404 라 규칙이 불필요하다.
    rules: [{ userAgent: '*', allow: '/', disallow: features.privacyPolicy ? ['/privacy'] : [] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
