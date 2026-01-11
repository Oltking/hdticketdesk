'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, ArrowRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatDate, formatTimeUntil, formatCurrency, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function UpcomingSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (!loading && events.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold">
                Upcoming Events
              </h2>
              <p className="text-sm text-muted-foreground">Don&apos;t miss out</p>
            </div>
          </div>
          
          <Link href="/events?sort=date">
            <Button variant="ghost" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {events.slice(0, 8).map((event, index) => (
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
      className="block group animate-in"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={cn(
        "relative h-72 rounded-2xl overflow-hidden",
        "bg-card border",
        "transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1"
      )}>
        {/* Date Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col items-center px-3 py-2 rounded-xl bg-white dark:bg-card shadow-lg text-center">
          <span className="text-xs font-semibold text-primary uppercase">
            {startDate.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-2xl font-display font-bold leading-none">
            {startDate.getDate()}
          </span>
        </div>
        
        {/* This Week Badge */}
        {isThisWeek && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-primary/90">This Week</Badge>
          </div>
        )}
        
        {/* Image */}
        <div className="h-36 overflow-hidden">
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
        <div className="p-4">
          <h3 className="font-display font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          
          <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimeUntil(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="line-clamp-1">{event.isLocationPublic === false ? 'Location after purchase' : (event.isOnline ? 'Online' : event.location?.split(',')[0] || 'TBA')}</span>
            </div>
          </div>
          
          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="font-display font-bold">
              {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice || 0)}
            </p>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}
