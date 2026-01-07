import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://hdticketdesk.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://hdticketdesk.com/events', lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: 'https://hdticketdesk.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://hdticketdesk.com/privacy', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
