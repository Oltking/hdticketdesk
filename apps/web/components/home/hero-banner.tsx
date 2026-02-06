'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, ArrowRight } from 'lucide-react';

export function HeroBanner() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const submitSearch = () => {
    const q = search.trim();
    if (!q) return;
    router.push(`/events?search=${encodeURIComponent(q)}`);
  };
  return (
    <section className="relative min-h-[52vh] flex items-start justify-center overflow-hidden gradient-mesh">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="container relative z-10 pt-2 pb-9 text-center">
        
        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-3 animate-in" style={{ animationDelay: '0.2s' }}>
          Discover <span className="text-gradient">Unforgettable</span>
          <br />
          Experiences
        </h1>
        
        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 animate-in" style={{ animationDelay: '0.3s' }}>
          Find and book tickets for concerts, conferences, workshops, and exclusive events happening near you.
        </p>
        
        {/* Search bar */}
        <div className="max-w-xl mx-auto mb-4 animate-in" style={{ animationDelay: '0.4s' }}>
          <form
            className="relative group"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500 pointer-events-none" />
            <div className="relative flex items-center bg-card rounded-xl border shadow-lg">
              <Search className="w-5 h-5 text-muted-foreground ml-3 md:ml-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, artists, venues..."
                className="flex-1 px-3 md:px-4 py-3.5 md:py-4 bg-transparent outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                size="sm"
                onClick={submitSearch}
                className="m-1.5 md:m-2 rounded-lg h-8 md:h-10 px-4 md:px-6 text-sm md:text-base"
              >
                Search
              </Button>
            </div>
          </form>
        </div>
        
        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 animate-in" style={{ animationDelay: '0.5s' }}>
          <Link href="/events">
            <Button size="lg" className="rounded-full px-7 md:px-8 py-5 md:py-6 text-sm md:text-base group">
              Browse Events
              <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 md:ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/signup?role=organizer">
            <Button size="lg" variant="outline" className="rounded-full px-7 md:px-8 py-5 md:py-6 text-sm md:text-base">
              Create Event
            </Button>
          </Link>
        </div>
        
        {/* Stats (hidden for now) */}
        {/**
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-16 mt-6 animate-in" style={{ animationDelay: '0.6s' }}>
          <div className="text-center">
            <p className="text-[26px] md:text-4xl font-display font-bold text-gradient">10K+</p>
            <p className="text-sm text-muted-foreground">Events Hosted</p>
          </div>
          <div className="text-center">
            <p className="text-[26px] md:text-4xl font-display font-bold text-gradient">500K+</p>
            <p className="text-sm text-muted-foreground">Tickets Sold</p>
          </div>
          <div className="text-center">
            <p className="text-[26px] md:text-4xl font-display font-bold text-gradient">50K+</p>
            <p className="text-sm text-muted-foreground">Happy Users</p>
          </div>
        </div>
        */}
      </div>
    </section>
  );
}
