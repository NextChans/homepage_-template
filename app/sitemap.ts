import type { MetadataRoute } from 'next'
import { services } from '@/content/services'
import { features } from '@/content/features'
import { siteUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // 비공개 페이지는 sitemap 에 넣지 않는다. 플래그를 켜면 자동으로 다시 포함된다.
  const paths = ['', '/services', '/about', '/contact']
  if (features.privacyPolicy) paths.push('/privacy')

  const staticRoutes = paths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  const serviceRoutes = services.map((s) => ({
    url: `${siteUrl}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...serviceRoutes]
}
