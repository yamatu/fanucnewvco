import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour

// 主sitemap - 只包含最重要的页面，其他通过专门的sitemap文件处理
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]
}
