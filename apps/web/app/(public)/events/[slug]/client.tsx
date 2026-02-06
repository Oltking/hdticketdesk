'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Globe, Ticket, Users, Clock, Share2, Heart, Loader2, Info, ExternalLink } from 'lucide-react';
import { Countdown } from '@/components/ui/countdown';
import { MapPreviewDialog } from '@/components/ui/map-preview-dialog';
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
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState<{
    open: boolean;
    tierId: string;
    tierName: string;
    tierPrice: number;
    serviceFee: number;
    totalAmount: number;
    authorizationUrl: string;
  } | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [guestEmailDialog, setGuestEmailDialog] = useState<{ tierId: string; tierName: string } | null>(null);
  const [guestEmail, setGuestEmail] = useState('');

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

  const refetchEvent = async () => {
    try {
      const data = await api.getEventBySlug(slug);
      setEvent(data);
    } catch (err) {
      console.error('Failed to refetch event:', err);
    }
  };

  const handlePurchase = async (tierId: string, email?: string) => {
    // For guests, show email dialog first
    if (!isAuthenticated && !email) {
      const tier = event!.tiers?.find(t => t.id === tierId);
      setGuestEmailDialog({ tierId, tierName: tier?.name || 'Ticket' });
      return;
    }

    setPurchasing(tierId);
    try {
      const response = await api.initializePayment(event!.id, tierId, email);
      
      // Handle free tickets - no payment gateway needed
      if (response.isFree) {
        success(response.message || 'Free ticket claimed successfully!');
        // Refetch event data to update ticket counts before redirecting
        await refetchEvent();
        // Redirect to tickets page
        router.push('/tickets');
        return;
      }
      
      // For paid tickets, show checkout dialog with price breakdown if there's a service fee
      if (response.authorizationUrl) {
        const tier = event!.tiers?.find(t => t.id === tierId);
        const tierPrice = response.tierPrice || Number(tier?.price) || 0;
        const serviceFee = response.serviceFee || 0;
        const totalAmount = response.totalAmount || tierPrice;
        
        // If there's a service fee, show confirmation dialog
        if (serviceFee > 0) {
          setCheckoutDialog({
            open: true,
            tierId,
            tierName: tier?.name || 'Ticket',
            tierPrice,
            serviceFee,
            totalAmount,
            authorizationUrl: response.authorizationUrl,
          });
        } else {
          // No service fee, redirect directly
          window.location.href = response.authorizationUrl;
        }
      } else {
        throw new Error('Payment initialization failed - no authorization URL');
      }
    } catch (err: any) {
      error(err.message || 'Failed to initialize payment');
      // Close the dialog if it was open
      setCheckoutDialog(null);
    } finally {
      setPurchasing(null);
    }
  };

  const handleConfirmCheckout = () => {
    if (checkoutDialog?.authorizationUrl) {
      setProcessingCheckout(true);
      window.location.href = checkoutDialog.authorizationUrl;
    }
  };

  const handleCancelCheckout = () => {
    setCheckoutDialog(null);
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
          <PageLoader text="Loading event details..." />
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

  // Event status logic:
  // - isPast: event has ended (endDate < now, or if no endDate, startDate < now)
  // - isLive: event is currently happening (started but not ended)
  // Note: isPast takes precedence - an event cannot be both live and past
  const now = new Date();
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  
  const isPast = endDate ? endDate < now : startDate < now;
  const isLive = !isPast && startDate <= now && (!endDate || endDate >= now);

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
                        {event.isLocationPublic === false ? (
                          <span>Location revealed after purchase</span>
                        ) : event.location ? (
                          <button 
                            onClick={() => setShowMapDialog(true)}
                            className="text-left hover:text-primary hover:underline transition-colors flex items-center gap-1"
                          >
                            <span className="line-clamp-1">{event.location}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </button>
                        ) : (
                          <span>TBA</span>
                        )}
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
                      const salesEnded = tier.saleEndDate && new Date(tier.saleEndDate) < new Date();
                      const isUnavailable = soldOut || salesEnded;
                      
                      return (
                        <div 
                          key={tier.id} 
                          className={cn(
                            "p-4 border rounded-xl transition-all",
                            isUnavailable ? "opacity-60" : "hover:border-primary hover:shadow-md",
                            Number(tier.price) === 0 && !isUnavailable && "border-green-200 bg-green-50/50"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{tier.name}</h3>
                                {Number(tier.price) === 0 && (
                                  <Badge className="bg-green-500 text-white text-xs">FREE</Badge>
                                )}
                                {salesEnded && (
                                  <Badge variant="secondary" className="text-xs">Sales Ended</Badge>
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
                          
                          {/* Sale End Countdown */}
                          {tier.saleEndDate && !salesEnded && (
                            <div className="flex items-center gap-1.5 text-xs mb-2">
                              <Clock className="w-3 h-3 text-orange-500" />
                              <Countdown 
                                targetDate={tier.saleEndDate} 
                                prefix="Sales end in"
                                expiredText="Sales ended"
                                compact
                              />
                            </div>
                          )}
                          
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
                              Number(tier.price) === 0 && !isUnavailable && "bg-green-600 hover:bg-green-700"
                            )}
                            disabled={isUnavailable || purchasing === tier.id}
                            onClick={() => handlePurchase(tier.id)}
                          >
                            {purchasing === tier.id ? (
                              <>Processing...</>
                            ) : salesEnded ? (
                              'Sales Ended'
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

      {/* Checkout Confirmation Dialog */}
      <Dialog open={checkoutDialog?.open || false} onOpenChange={(open) => !open && handleCancelCheckout()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Confirm Your Purchase
            </DialogTitle>
            <DialogDescription>
              Review your ticket details and price breakdown before proceeding to payment.
            </DialogDescription>
          </DialogHeader>
          
          {checkoutDialog && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{checkoutDialog.tierName}</p>
                <p className="text-sm text-muted-foreground">{event?.title}</p>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ticket Price</span>
                  <span>{formatCurrency(checkoutDialog.tierPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>{formatCurrency(checkoutDialog.serviceFee)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(checkoutDialog.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  You will be redirected to our secure payment gateway to complete your payment.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelCheckout} disabled={processingCheckout}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCheckout} disabled={processingCheckout}>
              {processingCheckout ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Email Dialog */}
      <Dialog open={!!guestEmailDialog} onOpenChange={(open) => !open && setGuestEmailDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Enter Your Email
            </DialogTitle>
          </DialogHeader>

          {guestEmailDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{guestEmailDialog.tierName}</p>
                <p className="text-sm text-muted-foreground">{event?.title}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-email">Email Address</Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="your@email.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We'll send your ticket to this email. You can create an account later to manage your tickets.
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Already have an account? <button onClick={() => router.push(`/login?redirect=/events/${slug}`)} className="underline font-medium">Sign in</button>
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setGuestEmailDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (guestEmail && guestEmailDialog) {
                  setGuestEmailDialog(null);
                  handlePurchase(guestEmailDialog.tierId, guestEmail);
                }
              }}
              disabled={!guestEmail || !/\S+@\S+\.\S+/.test(guestEmail)}
            >
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Preview Dialog */}
      {event && !event.isOnline && event.isLocationPublic !== false && event.location && (
        <MapPreviewDialog
          open={showMapDialog}
          onOpenChange={setShowMapDialog}
          location={event.location}
          latitude={event.latitude}
          longitude={event.longitude}
          eventTitle={event.title}
        />
      )}
    </>
  );
}
