'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Calendar, MapPin, Flame, ArrowRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function TrendingSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.getTrendingEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch trending events:', err);
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
    <section className="py-16 bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold">
                Trending Now
              </h2>
              <p className="text-sm text-muted-foreground">Most popular this week</p>
            </div>
          </div>
          
          <Link href="/events?sort=trending">
            <Button variant="ghost" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Trending Events Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <TrendingEventCard key={event.id} event={event} rank={index + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TrendingEventCard({ event, rank }: { event: Event; rank: number }) {
  const lowestPrice = event.tiers?.reduce((min, tier) => 
    tier.price < min ? tier.price : min, event.tiers[0]?.price || 0
  );
  
  const soldPercentage = (event.tiers?.reduce((acc, tier) => {
    return acc + (tier.sold / tier.capacity) * 100;
  }, 0) || 0) / (event.tiers?.length || 1);

  return (
    <Link 
      href={`/events/${event.slug}`}
      className="block group animate-in"
      style={{ animationDelay: `${rank * 0.1}s` }}
    >
      <div className={cn(
        "relative h-80 rounded-2xl overflow-hidden",
        "bg-card border shadow-sm",
        "transition-all duration-300",
        "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1"
      )}>
        {/* Rank Badge */}
        <div className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-display font-bold text-lg shadow-lg">
          {rank}
        </div>
        
        {/* Trending indicator */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-semibold">
          <TrendingUp className="w-3 h-3" />
          Hot
        </div>
        
        {/* Image */}
        <div className="h-44 overflow-hidden">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center">
              <Ticket className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5">
          <h3 className="font-display font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(event.startDate, 'short')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {event.isOnline ? 'Online' : event.location?.split(',')[0] || 'TBA'}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{event.totalTicketsSold} sold</span>
              <span className={cn(
                "font-semibold",
                soldPercentage >= 80 ? "text-red-500" : soldPercentage >= 50 ? "text-orange-500" : "text-green-500"
              )}>
                {soldPercentage >= 80 ? 'Almost gone!' : soldPercentage >= 50 ? 'Selling fast' : 'Available'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  soldPercentage >= 80 ? "bg-red-500" : soldPercentage >= 50 ? "bg-orange-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(soldPercentage, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-display font-bold text-lg">
                {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice || 0)}
              </p>
            </div>
            <Button size="sm" className="rounded-full">
              Get Tickets
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
