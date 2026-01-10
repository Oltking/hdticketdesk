'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || undefined;
  const sort = searchParams.get('sort') || undefined;
  const filter = searchParams.get('filter') || undefined;

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(pageParam);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(pageParam);
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params: any = { page };
        if (searchQuery) params.search = searchQuery;
        if (sort) params.sort = sort;
        if (filter) params.filter = filter;

        const res: any = await api.getEvents(params);
        console.debug('[Events] response', res);

        // Normalize response into an array
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.events)) list = res.events;
        else if (Array.isArray(res?.data)) list = res.data;
        else if (res && typeof res === 'object' && Object.keys(res).length === 0) list = [];
        else {
          // Unexpected shape - try to recover by converting to array if single object
          if (res && typeof res === 'object') {
            // If it's a paginated object with keys but not 'events', try common fields
            if (res.items && Array.isArray(res.items)) list = res.items;
            else if (res.results && Array.isArray(res.results)) list = res.results;
            else list = [];
          }
        }

        setEvents(list);
        setTotal(typeof res?.total === 'number' ? res.total : list.length);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParam, searchQuery, sort, filter]);

  const handlePage = (newPage: number) => {
    const params = new URLSearchParams(Object.fromEntries(Array.from(searchParams.entries())));
    params.set('page', String(newPage));
    router.push(`/events?${params.toString()}`);
  };

  if (loading) {
    return (
      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Events</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-44" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/')}>Home</Button>
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
              <Button disabled={page <= 1} onClick={() => handlePage(page - 1)}>Previous</Button>
              <Button disabled={events.length === 0} onClick={() => handlePage(page + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

    </main>
  );
}
