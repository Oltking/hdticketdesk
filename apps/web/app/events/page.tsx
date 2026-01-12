export const revalidate = 60;

import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';

type SearchParams = {
  page?: string | string[];
  search?: string | string[];
  sort?: string | string[];
  filter?: string | string[];
};

// Helper to build URL with params
function buildUrl(baseParams: { filter?: string; sort?: string; search?: string; page?: number }) {
  const params = new URLSearchParams();
  if (baseParams.page && baseParams.page > 1) params.set('page', String(baseParams.page));
  if (baseParams.filter) params.set('filter', baseParams.filter);
  if (baseParams.sort) params.set('sort', baseParams.sort);
  if (baseParams.search) params.set('search', baseParams.search);
  const queryString = params.toString();
  return `/events${queryString ? `?${queryString}` : ''}`;
}

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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  let events: any[] = [];
  let total = 0;

  try {
    const res = await fetch(`${API_BASE}/events?${params.toString()}`, { next: { revalidate: 60 } });
    if (res.ok) {
      let json: any = null;
      try {
        json = await res.json();
      } catch (parseErr) {
        console.warn('[Events] failed to parse JSON response', parseErr);
        json = null;
      }

      // Handle wrapped response from API (TransformInterceptor wraps in { success, data, timestamp })
      const responseData = json?.data || json;

      if (Array.isArray(responseData)) events = responseData;
      else if (responseData && Array.isArray(responseData.events)) events = responseData.events;
      else if (responseData && Array.isArray(responseData.data)) events = responseData.data;
      else if (responseData && Array.isArray(responseData.items)) events = responseData.items;

      total = typeof responseData?.total === 'number' ? responseData.total : events.length;
    } else {
      console.error('[Events] fetch failed status', res.status);
    }
  } catch (e) {
    console.error('[Events] fetch error', e);
  }

  return (
    <>
      <Header />
      <main className="flex-1 container py-8">
        {/* Title and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Events</h1>
          
          {/* Search Form */}
          <form action="/events" method="GET" className="flex items-center gap-2 w-full md:w-auto">
            {/* Preserve filter and sort when searching */}
            {filter && <input type="hidden" name="filter" value={filter} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            <div className="relative flex-1 md:w-72">
              <Input 
                type="search" 
                name="search" 
                placeholder="Search events..." 
                defaultValue={searchQuery || ''}
                className="pr-10"
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Filter Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href={buildUrl({ sort, search: searchQuery })}>
              <Badge 
                variant={!filter ? "default" : "outline"} 
                className={cn(
                  "cursor-pointer hover:bg-primary/90 transition-colors",
                  !filter && "bg-primary text-white"
                )}
              >
                All Events
              </Badge>
            </Link>
            <Link href={buildUrl({ filter: 'free', sort, search: searchQuery })}>
              <Badge 
                variant={filter === 'free' ? "default" : "outline"} 
                className={cn(
                  "cursor-pointer hover:bg-green-600/90 transition-colors",
                  filter === 'free' ? "bg-green-600 text-white" : "border-green-600 text-green-600 hover:bg-green-50"
                )}
              >
                🎉 Free Events
              </Badge>
            </Link>
            <Link href={buildUrl({ filter: 'upcoming', sort, search: searchQuery })}>
              <Badge 
                variant={filter === 'upcoming' ? "default" : "outline"} 
                className={cn(
                  "cursor-pointer hover:bg-primary/90 transition-colors",
                  filter === 'upcoming' && "bg-primary text-white"
                )}
              >
                Upcoming
              </Badge>
            </Link>
            <Link href={buildUrl({ filter: 'live', sort, search: searchQuery })}>
              <Badge 
                variant={filter === 'live' ? "default" : "outline"} 
                className={cn(
                  "cursor-pointer hover:bg-red-600/90 transition-colors",
                  filter === 'live' ? "bg-red-600 text-white" : "border-red-600 text-red-600 hover:bg-red-50"
                )}
              >
                🔴 Live Now
              </Badge>
            </Link>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="flex items-center gap-1">
              <Link href={buildUrl({ filter, search: searchQuery })}>
                <Badge 
                  variant={!sort ? "default" : "outline"} 
                  className={cn(
                    "cursor-pointer transition-colors text-xs",
                    !sort ? "bg-primary text-white" : "hover:bg-muted"
                  )}
                >
                  Date
                </Badge>
              </Link>
              <Link href={buildUrl({ filter, sort: 'newest', search: searchQuery })}>
                <Badge 
                  variant={sort === 'newest' ? "default" : "outline"} 
                  className={cn(
                    "cursor-pointer transition-colors text-xs",
                    sort === 'newest' ? "bg-primary text-white" : "hover:bg-muted"
                  )}
                >
                  Newest
                </Badge>
              </Link>
              <Link href={buildUrl({ filter, sort: 'trending', search: searchQuery })}>
                <Badge 
                  variant={sort === 'trending' ? "default" : "outline"} 
                  className={cn(
                    "cursor-pointer transition-colors text-xs",
                    sort === 'trending' ? "bg-primary text-white" : "hover:bg-muted"
                  )}
                >
                  🔥 Trending
                </Badge>
              </Link>
            </div>
          </div>
        </div>

        {/* Active Search Query Display */}
        {searchQuery && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">
              Showing results for: <strong className="text-foreground">"{searchQuery}"</strong>
            </span>
            <Link href={buildUrl({ filter, sort })} className="text-sm text-primary hover:underline">
              Clear search
            </Link>
          </div>
        )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-24 h-24 mb-6 opacity-20">
            <Image
              src="/icon.svg"
              alt="hdticketdesk"
              fill
              className="object-contain"
            />
          </div>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-6 rounded-full" />
          <h2 className="text-xl font-semibold mb-2 text-foreground">
            {searchQuery ? `No events found for "${searchQuery}"` :
             filter === 'free' ? 'No free events found' : 
             filter === 'live' ? 'No live events right now' :
             filter === 'upcoming' ? 'No upcoming events found' :
             'No events found'}
          </h2>
          <p className="text-muted-foreground mb-6 text-center max-w-sm">
            {searchQuery ? 'Try a different search term or browse all events' :
             filter === 'free' ? 'Check back soon for free events or browse all events' : 
             filter === 'live' ? 'No events are live at the moment. Check upcoming events!' :
             filter === 'upcoming' ? 'No upcoming events scheduled. Check back later!' :
             'Check back soon for upcoming events or explore other categories'}
          </p>
          <div className="flex gap-3">
            {(filter || searchQuery) && (
              <Link href="/events">
                <Button variant="outline" size="lg">View All Events</Button>
              </Link>
            )}
            <Link href="/">
              <Button size="lg">Back to Home</Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              // Check if event has any free tickets
              const hasFreeTickets = event.tiers?.some((tier: any) => Number(tier.price) === 0);
              // Get lowest price for display
              const lowestPrice = event.tiers?.length > 0 
                ? Math.min(...event.tiers.map((t: any) => Number(t.price)))
                : null;
              
              return (
                <Link key={event.id} href={`/events/${event.slug}`} className="block group rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow">
                  <div className="h-44 w-full bg-gray-100 relative">
                    {event.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.coverImage} alt={event.title} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">No Image</div>
                    )}
                    {/* Price/Free Badge */}
                    <div className="absolute top-2 right-2">
                      {hasFreeTickets ? (
                        <Badge className="bg-green-500 text-white">FREE</Badge>
                      ) : lowestPrice !== null && (
                        <Badge variant="secondary" className="bg-white/90 text-foreground">
                          From ₦{lowestPrice.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-text-muted mt-1">{event.location || (event.isOnline ? 'Online' : '')}</p>
                    <p className="text-sm text-muted mt-2">Starts: {new Date(event.startDate).toLocaleString()}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Page {page} {total ? `of ${Math.ceil(total / 12)}` : ''} 
              {total > 0 && <span className="ml-2">({total} events)</span>}
            </div>
            <div className="flex items-center gap-2">
              <Link href={buildUrl({ filter, sort, search: searchQuery, page: Math.max(1, page - 1) })}>
                <Button disabled={page <= 1}>Previous</Button>
              </Link>
              <Link href={buildUrl({ filter, sort, search: searchQuery, page: page + 1 })}>
                <Button disabled={events.length === 0 || page >= Math.ceil(total / 12)}>Next</Button>
              </Link>
            </div>
          </div>
        </>
      )}
      </main>
      <Footer />
    </>
  );
}
