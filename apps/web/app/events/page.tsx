export const revalidate = 60;

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type SearchParams = {
  page?: string | string[];
  search?: string | string[];
  sort?: string | string[];
  filter?: string | string[];
};

export default async function EventsPage({ searchParams }: { searchParams?: SearchParams }) {
  const page = parseInt(Array.isArray(searchParams?.page) ? searchParams?.page[0] : (searchParams?.page as string) || '1', 10) || 1;
  const searchQuery = Array.isArray(searchParams?.search) ? searchParams?.search[0] : (searchParams?.search as string) || undefined;
  const sort = Array.isArray(searchParams?.sort) ? searchParams?.sort[0] : (searchParams?.sort as string) || undefined;
  const filter = Array.isArray(searchParams?.filter) ? searchParams?.filter[0] : (searchParams?.filter as string) || undefined;

  const params = new URLSearchParams();
  params.set('page', String(page));
  if (searchQuery) params.set('search', searchQuery);
  if (sort) params.set('sort', sort);
  if (filter) params.set('filter', filter);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  let events: any[] = [];
  let total = 0;

  try {
    const res = await fetch(`${API_BASE}/events?${params.toString()}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) events = json;
      else if (Array.isArray(json.events)) events = json.events;
      else if (Array.isArray(json.data)) events = json.data;
      else if (Array.isArray(json.items)) events = json.items;

      total = typeof json.total === 'number' ? json.total : events.length;
    } else {
      console.error('[Events] fetch failed status', res.status);
    }
  } catch (e) {
    console.error('[Events] fetch error', e);
  }

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">No events found.</p>
          <Link href="/" className="text-primary hover:underline">Back to home</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.slug}`} className="block group rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow">
                <div className="h-44 w-full bg-gray-100">
                  {event.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.coverImage} alt={event.title} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">No Image</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm text-text-muted mt-1">{event.location || (event.isOnline ? 'Online' : '')}</p>
                  <p className="text-sm text-muted mt-2">Starts: {new Date(event.startDate).toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">Page {page} {total ? `of ${Math.ceil(total / 12)}` : ''}</div>
            <div className="flex items-center gap-2">
              <Link href={`/events?page=${Math.max(1, page - 1)}`}>
                <Button disabled={page <= 1}>Previous</Button>
              </Link>
              <Link href={`/events?page=${page + 1}`}>
                <Button disabled={events.length === 0}>Next</Button>
              </Link>
            </div>
          </div>
        </>
      )}

    </main>
  );
}
