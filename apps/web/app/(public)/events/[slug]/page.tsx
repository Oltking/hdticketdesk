import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventDetailClient } from './client';
import { generateEventStructuredData } from '@/lib/utils';

// Fetch event from API with proper response unwrapping
async function getEvent(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${slug}`, {
      // Short revalidation for ticket availability to update quickly
      next: { revalidate: 10 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Handle wrapped response from API (TransformInterceptor wraps in { success, data, timestamp })
    return json?.data || json;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await getEvent(params.slug);
  
  if (!event) {
    return { title: 'Event Not Found' };
  }

  return {
    title: event.title,
    description: event.description?.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.description?.slice(0, 160),
      type: 'website',
      url: `https://hdticketdesk.com/events/${event.slug}`,
      images: event.coverImage ? [{ url: event.coverImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description?.slice(0, 160),
      images: event.coverImage ? [event.coverImage] : [],
    },
  };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);

  return (
    <>
      {event && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateEventStructuredData(event)),
          }}
        />
      )}
      <EventDetailClient slug={params.slug} initialEvent={event} />
    </>
  );
}
