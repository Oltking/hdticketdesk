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
import { Search, Calendar, MapPin, Ticket, Sparkles, Filter, ArrowRight, Clock, Users, CheckCircle2, XCircle } from 'lucide-react';

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
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Discover Amazing Events</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Find Your Next <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">Experience</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Explore concerts, workshops, conferences, and more. Your next unforgettable moment is just a click away.
              </p>
              
              {/* Search Form */}
              <form action="/events" method="GET">
                {filter && <input type="hidden" name="filter" value={filter} />}
                {sort && <input type="hidden" name="sort" value={sort} />}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500" />
                  <div className="relative flex items-center bg-card rounded-xl border shadow-lg">
                    <Search className="w-5 h-5 text-muted-foreground ml-4" />
                    <input
                      type="text"
                      name="search"
                      defaultValue={searchQuery || ''}
                      placeholder="Search events, artists, venues..."
                      className="flex-1 px-4 py-4 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    />
                    <Button type="submit" className="m-2 rounded-lg">
                      Search
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="border-y bg-muted/30">
          <div className="container py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Filter Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2 hidden sm:inline">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filter:
                </span>
                <Link href={buildUrl({ sort, search: searchQuery })}>
                  <Badge 
                    variant={!filter ? "default" : "outline"} 
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      !filter ? "bg-primary text-white shadow-md" : "hover:bg-muted"
                    )}
                  >
                    All Events
                  </Badge>
                </Link>
                <Link href={buildUrl({ filter: 'free', sort, search: searchQuery })}>
                  <Badge 
                    variant={filter === 'free' ? "default" : "outline"} 
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      filter === 'free' ? "bg-green-500 text-white shadow-md" : "hover:bg-green-50 dark:hover:bg-green-950/30 border-green-500/50 text-green-600 dark:text-green-400"
                    )}
                  >
                    🎉 Free
                  </Badge>
                </Link>
                <Link href={buildUrl({ filter: 'upcoming', sort, search: searchQuery })}>
                  <Badge 
                    variant={filter === 'upcoming' ? "default" : "outline"} 
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      filter === 'upcoming' ? "bg-blue-500 text-white shadow-md" : "hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-500/50 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Upcoming
                  </Badge>
                </Link>
                <Link href={buildUrl({ filter: 'live', sort, search: searchQuery })}>
                  <Badge 
                    variant={filter === 'live' ? "default" : "outline"} 
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      filter === 'live' ? "bg-red-500 text-white shadow-md animate-pulse" : "hover:bg-red-50 dark:hover:bg-red-950/30 border-red-500/50 text-red-600 dark:text-red-400"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-current mr-1.5 animate-pulse" />
                    Live Now
                  </Badge>
                </Link>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <div className="flex items-center gap-1">
                  <Link href={buildUrl({ filter, search: searchQuery })}>
                    <Badge 
                      variant={!sort ? "default" : "outline"} 
                      className={cn(
                        "cursor-pointer transition-all duration-200 text-xs",
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
                        "cursor-pointer transition-all duration-200 text-xs",
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
                        "cursor-pointer transition-all duration-200 text-xs",
                        sort === 'trending' ? "bg-orange-500 text-white" : "hover:bg-orange-50 dark:hover:bg-orange-950/30 border-orange-500/50 text-orange-600 dark:text-orange-400"
                      )}
                    >
                      🔥 Trending
                    </Badge>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Events Grid Section */}
        <section className="py-12">
          <div className="container">
            {/* Active Search Query Display */}
            {searchQuery && (
              <div className="flex items-center gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Showing results for: <strong className="text-foreground">"{searchQuery}"</strong>
                </span>
                <Link href={buildUrl({ filter, sort })} className="text-sm text-primary hover:underline ml-auto">
                  Clear search
                </Link>
              </div>
            )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center mb-6">
            <Ticket className="w-10 h-10 text-primary/50" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2 text-foreground">
            {searchQuery ? `No events found for "${searchQuery}"` :
             filter === 'free' ? 'No free events found' : 
             filter === 'live' ? 'No live events right now' :
             filter === 'upcoming' ? 'No upcoming events found' :
             'No events found'}
          </h2>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            {searchQuery ? 'Try a different search term or browse all events' :
             filter === 'free' ? 'Check back soon for free events or browse all events' : 
             filter === 'live' ? 'No events are live at the moment. Check upcoming events!' :
             filter === 'upcoming' ? 'No upcoming events scheduled. Check back later!' :
             'Check back soon for upcoming events or explore other categories'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {(filter || searchQuery) && (
              <Link href="/events">
                <Button variant="outline" size="lg" className="rounded-full">View All Events</Button>
              </Link>
            )}
            <Link href="/">
              <Button size="lg" className="rounded-full">Back to Home</Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{events.length}</span> events
              {total > 0 && <span> of {total}</span>}
            </p>
          </div>

          {/* Events Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Sort events: Live first, then upcoming by date, then ended at bottom */}
            {[...events].sort((a, b) => {
              const now = new Date();
              const aStart = new Date(a.startDate);
              const bStart = new Date(b.startDate);
              const aEnd = a.endDate ? new Date(a.endDate) : aStart;
              const bEnd = b.endDate ? new Date(b.endDate) : bStart;
              
              const aIsLive = aStart <= now && aEnd >= now;
              const bIsLive = bStart <= now && bEnd >= now;
              const aIsEnded = aEnd < now;
              const bIsEnded = bEnd < now;
              
              // Live events first
              if (aIsLive && !bIsLive) return -1;
              if (!aIsLive && bIsLive) return 1;
              
              // Ended events last
              if (aIsEnded && !bIsEnded) return 1;
              if (!aIsEnded && bIsEnded) return -1;
              
              // Sort by start date (upcoming events closest first)
              return aStart.getTime() - bStart.getTime();
            }).map((event) => {
              // Check if event has any free tickets
              const hasFreeTickets = event.tiers?.some((tier: any) => Number(tier.price) === 0);
              // Get lowest price for display
              const lowestPrice = event.tiers?.length > 0 
                ? Math.min(...event.tiers.map((t: any) => Number(t.price)))
                : null;
              
              // Format date nicely
              const eventDate = new Date(event.startDate);
              const endDate = event.endDate ? new Date(event.endDate) : eventDate;
              const now = new Date();
              const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              
              // Determine event status
              const isLive = eventDate <= now && endDate >= now;
              const isEnded = endDate < now;
              
              return (
                <Link 
                  key={event.id} 
                  href={`/events/${event.slug}`} 
                  className={cn(
                    "group relative bg-card rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20",
                    isEnded && "opacity-75 hover:opacity-100"
                  )}
                >
                  {/* Image */}
                  <div className="h-48 w-full bg-muted relative overflow-hidden">
                    {event.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={event.coverImage} 
                        alt={event.title} 
                        className={cn(
                          "object-cover w-full h-full transition-transform duration-500 group-hover:scale-110",
                          isEnded && "grayscale-[30%]"
                        )}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-purple-500/5">
                        <Ticket className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* ENDED Stamp */}
                    {isEnded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/70 text-white px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transform -rotate-12 border-2 border-white/30">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            ENDED
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* LIVE NOW Badge */}
                    {isLive && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-red-500 text-white shadow-lg animate-pulse gap-1">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          LIVE NOW
                        </Badge>
                      </div>
                    )}
                    
                    {/* Price/Free Badge */}
                    <div className="absolute top-3 right-3">
                      {hasFreeTickets ? (
                        <Badge className="bg-green-500 text-white shadow-lg">FREE</Badge>
                      ) : lowestPrice !== null && (
                        <Badge className="bg-white/95 text-foreground shadow-lg backdrop-blur-sm">
                          From ₦{lowestPrice.toLocaleString()}
                        </Badge>
                      )}
                    </div>

                    {/* Date badge at bottom of image */}
                    <div className="absolute bottom-3 left-3">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-sm rounded-lg text-xs",
                        isEnded ? "bg-gray-800/70 text-gray-300" : "bg-black/50 text-white"
                      )}>
                        <Calendar className="w-3 h-3" />
                        {dateStr} • {timeStr}
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <h3 className={cn(
                      "font-display font-semibold text-lg mb-2 line-clamp-2 transition-colors",
                      isEnded ? "text-muted-foreground group-hover:text-foreground" : "group-hover:text-primary"
                    )}>
                      {event.title}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {event.location || (event.isOnline ? '🌐 Online Event' : 'Location TBA')}
                      </span>
                    </div>

                    {/* Tickets sold indicator - shows "attended" for ended events */}
                    {event.totalTicketsSold > 0 && (
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs mt-3 pt-3 border-t",
                        isEnded ? "text-muted-foreground/70" : "text-muted-foreground"
                      )}>
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {event.totalTicketsSold} {isEnded ? 'attended' : 'attending'}
                        </span>
                        {isEnded && (
                          <span className="ml-auto text-xs text-muted-foreground/50 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Hover arrow */}
                  <div className={cn(
                    "absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                    isEnded ? "bg-muted" : "bg-primary/10"
                  )}>
                    <ArrowRight className={cn(
                      "w-4 h-4",
                      isEnded ? "text-muted-foreground" : "text-primary"
                    )} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium">{page}</span>
              {total > 0 && <span> of {Math.ceil(total / 12)}</span>}
            </p>
            <div className="flex items-center gap-2">
              <Link href={buildUrl({ filter, sort, search: searchQuery, page: Math.max(1, page - 1) })}>
                <Button variant="outline" disabled={page <= 1} className="rounded-full">
                  Previous
                </Button>
              </Link>
              <Link href={buildUrl({ filter, sort, search: searchQuery, page: page + 1 })}>
                <Button disabled={events.length === 0 || page >= Math.ceil(total / 12)} className="rounded-full">
                  Next
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
