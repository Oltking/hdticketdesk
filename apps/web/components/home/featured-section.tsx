'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Star, Calendar, MapPin, ArrowRight, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function FeaturedSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.getFeaturedEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch featured events:', err);
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
      const scrollAmount = 336; // Card width (320) + gap (16)
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
    <section className="py-20 relative overflow-hidden">
      {/* Premium golden gradient background - darker version */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 dark:from-yellow-950/40 dark:via-amber-950/30 dark:to-orange-950/30" />
      <div className="absolute top-0 left-0 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl" />
      
      <div className="container relative z-10">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/10">
              <Crown className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold">
                Featured Events
              </h2>
              <p className="text-sm text-muted-foreground">Handpicked for you</p>
            </div>
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
            <Link href="/events?filter=featured">
              <Button variant="ghost" className="group">
                View All
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured Events Carousel */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-80 h-52 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={checkScrollability}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mb-4"
          >
            {events.map((event, index) => (
              <FeaturedEventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedEventCard({ event, index }: { event: Event; index: number }) {
  const lowestPrice = event.tiers?.reduce((min, tier) => 
    tier.price < min ? tier.price : min, event.tiers[0]?.price || 0
  );

  return (
    <Link 
      href={`/events/${event.slug}`} 
      className="block group flex-shrink-0 w-80 snap-start"
    >
      <div className={cn(
        "relative h-52 rounded-xl overflow-hidden",
        "bg-card border-2 border-yellow-500/20",
        "transition-all duration-300",
        "hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/10"
      )}>
        {/* Background */}
        <div className="absolute inset-0">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        </div>
        
        {/* Featured Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold shadow-lg">
          <Star className="w-3.5 h-3.5 fill-current" />
          Featured
        </div>
        
        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <Badge className="mb-2 bg-white/20 backdrop-blur text-white border-0 text-xs">
            {event.organizer?.title || 'Organizer'}
          </Badge>
          
          <h3 className="font-display font-bold text-white text-xl mb-2 line-clamp-2 group-hover:text-yellow-100 transition-colors">
            {event.title}
          </h3>
          
          <p className="text-white/80 text-sm mb-3 line-clamp-2">
            {event.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 text-xs text-white/80">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(event.startDate, 'short')}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[150px]">{event.isLocationPublic === false ? 'Location after purchase' : (event.isOnline ? 'Online' : event.location?.split(',')[0] || 'TBA')}</span>
              </span>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-white/60">From</p>
              <p className="font-display font-bold text-white text-lg">
                {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
