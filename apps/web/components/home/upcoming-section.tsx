'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, ArrowRight, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatDate, formatTimeUntil, formatCurrency, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function UpcomingSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.getUpcomingEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch upcoming events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [events]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 240; // Card width (224) + gap (16)
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollability, 300);
    }
  };

  if (!loading && events.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 relative overflow-hidden bg-zinc-900">
      {/* Charcoal black rough surface background */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                Upcoming Events
              </h2>
              <p className="text-sm text-zinc-400">Don&apos;t miss out</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-9 w-9 border-zinc-600 text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-9 w-9 border-zinc-600 text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Link href="/events?sort=date">
              <Button variant="ghost" className="group text-white hover:text-white hover:bg-white/10">
                View All
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Events Carousel */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-56 h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={checkScrollability}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mb-4"
          >
            {events.map((event, index) => (
              <UpcomingEventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function UpcomingEventCard({ event, index }: { event: Event; index: number }) {
  const lowestPrice = event.tiers?.reduce((min, tier) => 
    tier.price < min ? tier.price : min, event.tiers[0]?.price || 0
  );
  
  const startDate = new Date(event.startDate);
  const isThisWeek = startDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="block group animate-in flex-shrink-0 w-56 snap-start"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={cn(
        "relative h-64 rounded-xl overflow-hidden",
        "bg-card border",
        "transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1"
      )}>
        {/* Date Badge */}
        <div className="absolute top-3 left-3 z-10 flex flex-col items-center px-2.5 py-1.5 rounded-xl bg-white dark:bg-card shadow-lg text-center">
          <span className="text-[10px] font-semibold text-primary uppercase">
            {startDate.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-xl font-display font-bold leading-none">
            {startDate.getDate()}
          </span>
        </div>

        {/* This Week Badge */}
        {isThisWeek && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-primary/90 text-xs">This Week</Badge>
          </div>
        )}

        {/* Image */}
        <div className="h-32 overflow-hidden">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
              <Ticket className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-3">
          <h3 className="font-display font-semibold text-sm mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          <div className="space-y-1 text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTimeUntil(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{event.isLocationPublic === false ? 'Location after purchase' : (event.isOnline ? 'Online' : event.location?.split(',')[0] || 'TBA')}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="font-display font-bold text-sm">
              {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice || 0)}
            </p>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}
