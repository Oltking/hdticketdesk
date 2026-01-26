'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Radio, MapPin, Users, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatCurrency, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function LiveNowSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.getLiveEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch live events:', err);
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
      const scrollAmount = 304; // Card width (288) + gap (16)
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollability, 300);
    }
  };

  // Don't render section if no live events
  if (!loading && events.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 relative overflow-hidden">
      {/* Dynamic red gradient background - darker version */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-100 via-red-50 to-orange-100 dark:from-red-950/50 dark:via-red-950/30 dark:to-orange-950/40" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-red-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-orange-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              Live Now
            </h2>
            <Badge variant="destructive" className="animate-pulse">
              {events.length} Event{events.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-9 w-9"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-9 w-9"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Link href="/events?filter=live">
              <Button variant="ghost" className="group">
                View All
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Events Carousel */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-72 h-44 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={checkScrollability}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mb-4"
          >
            {events.map((event, index) => (
              <LiveEventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LiveEventCard({ event, index }: { event: Event; index: number }) {
  const lowestPrice = event.tiers?.reduce((min, tier) => 
    tier.price < min ? tier.price : min, event.tiers[0]?.price || 0
  );

  return (
    <Link
      href={`/events/${event.slug}`}
      className="block group animate-in flex-shrink-0 w-72 snap-start"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={cn(
        "relative h-44 rounded-xl overflow-hidden",
        "bg-card border-2 border-red-500/30",
        "transition-all duration-300",
        "hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20",
        "hover:scale-[1.02]"
      )}>
        {/* Background */}
        <div className="absolute inset-0">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-purple-500/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
        
        {/* Live Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-semibold shadow-lg">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          LIVE
        </div>

        {/* Attendees count */}
        {(event.totalTicketsSold || 0) > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-white text-xs">
            <Users className="w-3.5 h-3.5" />
            {event.totalTicketsSold}
          </div>
        )}

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-display font-bold text-white text-base mb-1 line-clamp-2 group-hover:text-red-100 transition-colors">
            {event.title}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-white/80">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{event.isLocationPublic === false ? 'Location after purchase' : (event.isOnline ? 'Online Event' : event.location || 'TBA')}</span>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-white/60">From</p>
              <p className="font-display font-bold text-white text-sm">
                {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice || 0)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Pulse ring effect */}
        <div className="absolute inset-0 rounded-2xl ring-2 ring-red-500/50 animate-pulse-glow pointer-events-none" />
      </div>
    </Link>
  );
}
