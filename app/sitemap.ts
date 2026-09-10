import type { MetadataRoute } from 'next'
import { services } from '@/content/services'
import { site } from '@/content/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes = ['', '/services', '/about', '/contact'].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  const serviceRoutes = services.map((s) => ({
    url: `${site.url}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...serviceRoutes]
}
