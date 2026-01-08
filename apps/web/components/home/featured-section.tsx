'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Calendar, MapPin, ArrowRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { Event } from '@/types';

export function FeaturedSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (!loading && events.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-muted/30 to-transparent">
      <div className="container">
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
          
          <Link href="/events?filter=featured">
            <Button variant="ghost" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Featured Events */}
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-96 rounded-2xl bg-card animate-pulse" />
            <div className="grid gap-6">
              <div className="h-44 rounded-2xl bg-card animate-pulse" />
              <div className="h-44 rounded-2xl bg-card animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Main Featured */}
            {events[0] && <MainFeaturedCard event={events[0]} />}
            
            {/* Secondary Featured */}
            <div className="grid gap-6">
              {events.slice(1, 3).map((event, index) => (
                <SecondaryFeaturedCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MainFeaturedCard({ event }: { event: Event }) {
  const lowestPrice = event.tiers?.reduce((min, tier) => 
    tier.price < min ? tier.price : min, event.tiers[0]?.price || 0
  );

  return (
    <Link href={`/events/${event.slug}`} className="block group">
      <div className={cn(
        "relative h-96 rounded-2xl overflow-hidden",
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
        <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold shadow-lg">
          <Star className="w-4 h-4 fill-current" />
          Featured
        </div>
        
        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <Badge className="mb-3 bg-white/20 backdrop-blur text-white border-0">
            {event.organizer?.title || 'Organizer'}
          </Badge>
          
          <h3 className="font-display font-bold text-white text-2xl md:text-3xl mb-3 line-clamp-2 group-hover:text-yellow-100 transition-colors">
            {event.title}
          </h3>
          
          <p className="text-white/80 mb-4 line-clamp-2">
            {event.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(event.startDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.isOnline ? 'Online' : event.location?.split(',')[0] || 'TBA'}
              </span>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-white/60">From</p>
              <p className="font-display font-bold text-white text-xl">
                {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SecondaryFeaturedCard({ event, index }: { event: Event; index: number }) {
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
        "relative h-44 rounded-2xl overflow-hidden",
        "bg-card border",
        "transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.01]"
      )}>
        <div className="flex h-full">
          {/* Image */}
          <div className="w-44 h-full flex-shrink-0 overflow-hidden">
            {event.coverImage ? (
              <img
                src={event.coverImage}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500">Featured</span>
              </div>
              <h3 className="font-display font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(event.startDate, 'short')}
                </div>
              </div>
              <p className="font-display font-bold">
                {lowestPrice === 0 ? 'Free' : formatCurrency(lowestPrice || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
