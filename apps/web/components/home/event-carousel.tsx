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
      <section className="py-8 bg-gradient-to-b from-transparent to-muted/30">
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
    <section className="py-8 bg-gradient-to-b from-transparent to-muted/30 overflow-hidden">
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
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling track */}
        <div 
          className="flex gap-6 animate-slide-left pause-animation"
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
        "relative w-72 h-48 rounded-2xl overflow-hidden transition-all duration-300",
        "bg-card border shadow-lg",
        "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
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
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            Starting Soon
          </div>
        )}
        
        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display font-semibold text-white text-lg mb-2 line-clamp-1 group-hover:text-primary-foreground transition-colors">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-3 text-xs text-white/80">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(event.startDate, 'short')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeUntil(event.startDate)}
            </span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-white/60 mt-1">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </div>
        
        {/* Hover Arrow */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
      </div>
    </Link>
  );
}
