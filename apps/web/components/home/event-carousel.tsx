'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDate, formatTimeUntil, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function EventCarousel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.getCarouselEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch carousel events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Don't render if no events
  if (!loading && events.length === 0) {
    return null;
  }

  // For single event, no animation needed
  if (events.length === 1) {
    return (
      <section className="py-6 md:py-10 bg-gradient-to-b from-purple-100 via-fuchsia-100 to-pink-100 dark:from-purple-950/40 dark:via-fuchsia-950/25 dark:to-pink-950/35">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              🔥 Coming Up Next
            </h2>
          </div>
          <div className="flex justify-center">
            <EventCard event={events[0]} />
          </div>
        </div>
      </section>
    );
  }

  // Duplicate events for infinite scroll effect
  const duplicatedEvents = [...events, ...events];

  return (
    <section className="py-6 md:py-10 bg-gradient-to-b from-purple-100 via-fuchsia-100 to-pink-100 dark:from-purple-950/40 dark:via-fuchsia-950/25 dark:to-pink-950/35 overflow-hidden">
      <div className="container mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            🔥 Coming Up Next
          </h2>
          <Link href="/events" className="text-sm text-primary hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      
      {/* Scrolling container */}
      <div className="relative">
        {/* Gradient masks - blend into page background */}
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background via-background/70 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background via-background/70 to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling track */}
        <div 
          className="flex gap-4 md:gap-6 animate-slide-left pause-animation"
          style={{
            width: 'fit-content',
            animationDuration: `${events.length * 5}s`,
          }}
        >
          {duplicatedEvents.map((event, index) => (
            <EventCard key={`${event.id}-${index}`} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
}

function EventCard({ event }: { event: Event }) {
  const isStartingSoon = new Date(event.startDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  
  return (
    <Link href={`/events/${event.slug}`} className="block flex-shrink-0 group">
      <div className={cn(
        "relative w-64 h-40 rounded-xl overflow-hidden transition-all duration-300",
        "bg-card border shadow-md",
        "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1",
        isStartingSoon && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}>
        {/* Background Image */}
        <div className="absolute inset-0">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        </div>
        
        {/* Starting Soon Badge */}
        {isStartingSoon && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            Soon
          </div>
        )}
        
        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-display font-semibold text-white text-base mb-1.5 line-clamp-1 group-hover:text-primary-foreground transition-colors">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-2 text-[11px] text-white/80">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(event.startDate, 'short')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeUntil(event.startDate)}
            </span>
          </div>
        </div>
        
        {/* Hover Arrow */}
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/10 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    </Link>
  );
}
