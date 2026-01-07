'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, MapPin, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatCurrency, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function LiveNowSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Don't render section if no live events
  if (!loading && events.length === 0) {
    return null;
  }

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Pulsing background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5" />
      
      <div className="container relative">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
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
          
          <Link href="/events?filter=live">
            <Button variant="ghost" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Live Events Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      className="block group animate-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={cn(
        "relative h-64 rounded-2xl overflow-hidden",
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
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-semibold shadow-lg">
          <Radio className="w-4 h-4 animate-pulse" />
          LIVE
        </div>
        
        {/* Attendees count */}
        {event.totalTicketsSold > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-sm">
            <Users className="w-4 h-4" />
            {event.totalTicketsSold} attending
          </div>
        )}
        
        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display font-bold text-white text-xl mb-2 line-clamp-2 group-hover:text-red-100 transition-colors">
            {event.title}
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{event.isOnline ? 'Online Event' : event.location || 'TBA'}</span>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-white/60">From</p>
              <p className="font-display font-bold text-white">
                {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice)}
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
