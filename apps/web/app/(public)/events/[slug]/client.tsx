'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { api } from '@/lib/api-client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Globe, Ticket, Users, Clock, Share2, Heart } from 'lucide-react';
import type { Event } from '@/types';

interface Props {
  slug: string;
  initialEvent: Event | null;
}

export function EventDetailClient({ slug, initialEvent }: Props) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { error, success } = useToast();
  const [event, setEvent] = useState<Event | null>(initialEvent);
  const [loading, setLoading] = useState(!initialEvent);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!initialEvent) {
      const fetchEvent = async () => {
        try {
          const data = await api.getEventBySlug(slug);
          setEvent(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    }
  }, [slug, initialEvent]);

  const handlePurchase = async (tierId: string) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }
    setPurchasing(tierId);
    try {
      const response = await api.initializePayment(event!.id, tierId);
      
      // Handle free tickets - no payment gateway needed
      if (response.isFree) {
        success(response.message || 'Free ticket claimed successfully!');
        // Redirect to tickets page
        router.push('/tickets');
        return;
      }
      
      // For paid tickets, redirect to Paystack
      window.location.href = response.authorizationUrl;
    } catch (err: any) {
      error(err.message || 'Failed to initialize payment');
    } finally {
      setPurchasing(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event?.title,
        text: event?.description?.slice(0, 100),
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <Skeleton className="h-80 w-full" />
          <div className="container py-8">
            <Skeleton className="h-10 w-2/3 mb-4" />
            <Skeleton className="h-6 w-1/3 mb-8" />
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-40" />
              </div>
              <Skeleton className="h-80" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Header />
        <main className="flex-1 container py-16 text-center">
          <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">This event may have been removed or doesn't exist.</p>
          <Button onClick={() => router.push('/events')}>Browse Events</Button>
        </main>
        <Footer />
      </>
    );
  }

  const isLive = new Date(event.startDate) <= new Date() && (!event.endDate || new Date(event.endDate) >= new Date());
  const isPast = event.endDate ? new Date(event.endDate) < new Date() : new Date(event.startDate) < new Date();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Image */}
        <div className="relative h-64 md:h-80 lg:h-96 bg-gradient-to-br from-primary/20 to-purple-500/20">
          {event.coverImage ? (
            <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="w-20 h-20 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            {isLive && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white mr-2 animate-ping" />
                LIVE NOW
              </Badge>
            )}
            {isPast && <Badge variant="secondary">Event Ended</Badge>}
          </div>
          
          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button variant="secondary" size="icon" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="container py-8 -mt-20 relative">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass">
                <CardContent className="p-6">
                  <Badge className="mb-3">{event.status}</Badge>
                  <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">{event.title}</h1>
                  <p className="text-muted-foreground mb-4">by {event.organizer?.title || 'Organizer'}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>{formatDate(event.startDate)}</span>
                    </div>
                    {event.isOnline ? (
                      <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        <span>{event.isLocationPublic === false ? 'Online Event (link sent after purchase)' : 'Online Event'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <span>{event.isLocationPublic === false ? 'Location revealed after purchase' : (event.location || 'TBA')}</span>
                      </div>
                    )}
                    {(event.totalTicketsSold || 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <span>{event.totalTicketsSold} attending</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground">{event.description}</p>
                </CardContent>
              </Card>

              {event.gallery && event.gallery.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Gallery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {event.gallery.map((img, i) => (
                        <img key={i} src={img} alt={`Gallery ${i + 1}`} className="rounded-lg object-cover aspect-square" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tickets Sidebar */}
            <div className="space-y-4">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5" />
                    Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isPast ? (
                    <p className="text-center text-muted-foreground py-4">This event has ended</p>
                  ) : (
                    event.tiers?.map((tier) => {
                      const soldOut = tier.sold >= tier.capacity;
                      const percentSold = (tier.sold / tier.capacity) * 100;
                      
                      return (
                        <div 
                          key={tier.id} 
                          className={cn(
                            "p-4 border rounded-xl transition-all",
                            soldOut ? "opacity-60" : "hover:border-primary hover:shadow-md",
                            Number(tier.price) === 0 && !soldOut && "border-green-200 bg-green-50/50"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{tier.name}</h3>
                                {Number(tier.price) === 0 && (
                                  <Badge className="bg-green-500 text-white text-xs">FREE</Badge>
                                )}
                              </div>
                              {tier.description && (
                                <p className="text-sm text-muted-foreground">{tier.description}</p>
                              )}
                            </div>
                            <span className={cn(
                              "font-display font-bold text-lg",
                              Number(tier.price) === 0 && "text-green-600"
                            )}>
                              {Number(tier.price) === 0 ? 'Free' : formatCurrency(tier.price)}
                            </span>
                          </div>
                          
                          {/* Capacity bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{tier.capacity - tier.sold} left</span>
                              <span>{Math.round(percentSold)}% sold</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  percentSold >= 80 ? "bg-red-500" : percentSold >= 50 ? "bg-orange-500" : "bg-green-500"
                                )}
                                style={{ width: `${percentSold}%` }}
                              />
                            </div>
                          </div>
                          
                          <Button 
                            className={cn(
                              "w-full",
                              Number(tier.price) === 0 && !soldOut && "bg-green-600 hover:bg-green-700"
                            )}
                            disabled={soldOut || purchasing === tier.id}
                            onClick={() => handlePurchase(tier.id)}
                          >
                            {purchasing === tier.id ? (
                              <>Processing...</>
                            ) : soldOut ? (
                              'Sold Out'
                            ) : Number(tier.price) === 0 ? (
                              'Claim Free Ticket'
                            ) : (
                              'Get Tickets'
                            )}
                          </Button>
                          
                          {tier.refundEnabled && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              ✓ Refunds available
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
