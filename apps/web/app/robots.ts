import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/', '/settings/', '/payouts/'],
    },
    sitemap: 'https://hdticketdesk.com/sitemap.xml',
  };
}
