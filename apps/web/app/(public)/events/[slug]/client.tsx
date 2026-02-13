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
import { Calendar, MapPin, Globe, Ticket, Users, Clock, Share2, Heart, Loader2, Info, ExternalLink, ChevronDown } from 'lucide-react';
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

  // Helper component for rendering ticket tiers
  const TicketTierCard = ({ tier }: { tier: any }) => {
    const soldOut = tier.sold >= tier.capacity;
    const percentSold = (tier.sold / tier.capacity) * 100;
    const salesEnded = tier.saleEndDate && new Date(tier.saleEndDate) < new Date();
    const isUnavailable = soldOut || salesEnded;
    const hideProgress = event?.hideTicketSalesProgress;
    const isFree = Number(tier.price) === 0;
    
    return (
      <div 
        className={cn(
          "p-4 border rounded-xl transition-all",
          isUnavailable ? "opacity-60" : "hover:border-primary hover:shadow-md",
          isFree && !isUnavailable && "border-green-200 bg-green-50/50 dark:bg-green-950/20"
        )}
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{tier.name}</h3>
              {isFree && (
                <Badge className="bg-green-500 text-white text-xs flex-shrink-0">FREE</Badge>
              )}
              {salesEnded && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">Sales Ended</Badge>
              )}
            </div>
            {tier.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tier.description}</p>
            )}
          </div>
          <span className={cn(
            "font-display font-bold text-lg flex-shrink-0",
            isFree && "text-green-600"
          )}>
            {isFree ? 'Free' : formatCurrency(tier.price)}
          </span>
        </div>
        
        {/* Sale End Countdown */}
        {tier.saleEndDate && !salesEnded && (
          <div className="flex items-center gap-1.5 text-xs mb-2 text-orange-600 dark:text-orange-400">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <Countdown 
              targetDate={tier.saleEndDate} 
              prefix="Sales end in"
              expiredText="Sales ended"
              compact
            />
          </div>
        )}
        
        {/* Capacity bar - hidden when hideTicketSalesProgress is enabled */}
        {!hideProgress && (
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
                style={{ width: `${Math.min(percentSold, 100)}%` }}
              />
            </div>
          </div>
        )}
        
        <Button 
          className={cn(
            "w-full",
            isFree && !isUnavailable && "bg-green-600 hover:bg-green-700"
          )}
          disabled={isUnavailable || purchasing === tier.id}
          onClick={() => handlePurchase(tier.id)}
        >
          {purchasing === tier.id ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
          ) : salesEnded ? (
            'Sales Ended'
          ) : soldOut ? (
            'Sold Out'
          ) : isFree ? (
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
  };

  return (
    <>
      <Header />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Hero Image */}
        <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 bg-gradient-to-br from-primary/20 to-purple-500/20">
          {event.coverImage ? (
            <img 
              src={event.coverImage} 
              alt={event.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-purple-500/10">
              <Ticket className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
            {isLive && (
              <Badge className="bg-red-500 text-white animate-pulse text-xs sm:text-sm">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white mr-1.5 sm:mr-2 animate-ping" />
                LIVE NOW
              </Badge>
            )}
            {isPast && <Badge variant="secondary" className="text-xs sm:text-sm">Event Ended</Badge>}
          </div>
          
          {/* Action buttons */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-2">
            <Button variant="secondary" size="icon" onClick={handleShare} className="h-8 w-8 sm:h-10 sm:w-10">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="container px-4 sm:px-6 lg:px-8 py-6 sm:py-8 -mt-16 sm:-mt-20 relative">
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
            
            {/* Event Info Card - Full width on mobile, 2 cols on desktop */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
              {/* Main Event Card */}
              <Card className="backdrop-blur-sm bg-card/95 shadow-lg border-0 sm:border overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="text-xs">{event.status}</Badge>
                    {event.organizer?.title && (
                      <span className="text-xs text-muted-foreground">by {event.organizer.title}</span>
                    )}
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4 break-words">
                    {event.title}
                  </h1>
                  
                  {/* Event Meta Info */}
                  <div className="space-y-3">
                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">{formatDate(event.startDate)}</p>
                        {event.endDate && (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            to {formatDate(event.endDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        {event.isOnline ? (
                          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        ) : (
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {event.isOnline ? (
                          <p className="font-medium text-sm sm:text-base">
                            {event.isLocationPublic === false ? 'Online Event' : 'Online Event'}
                          </p>
                        ) : event.isLocationPublic === false ? (
                          <p className="font-medium text-sm sm:text-base">Location revealed after purchase</p>
                        ) : event.location ? (
                          <button 
                            onClick={() => setShowMapDialog(true)}
                            className="text-left hover:text-primary transition-colors group w-full"
                          >
                            <p className="font-medium text-sm sm:text-base group-hover:underline break-words">
                              {event.location}
                            </p>
                            <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                              View on map <ExternalLink className="w-3 h-3" />
                            </p>
                          </button>
                        ) : (
                          <p className="font-medium text-sm sm:text-base">Location TBA</p>
                        )}
                        {event.isOnline && event.isLocationPublic === false && (
                          <p className="text-xs text-muted-foreground mt-0.5">Link sent after purchase</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Attendees - only show if not hidden */}
                    {!event.hideTicketSalesProgress && (event.totalTicketsSold || 0) > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm sm:text-base">{event.totalTicketsSold} attending</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* About Section */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl">About This Event</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
                    {event.description}
                  </p>
                </CardContent>
              </Card>

              {/* Gallery Section */}
              {event.gallery && event.gallery.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl">Gallery</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                      {event.gallery.map((img, i) => (
                        <img 
                          key={i} 
                          src={img} 
                          alt={`Gallery ${i + 1}`} 
                          className="rounded-lg object-cover aspect-square w-full"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tickets Section - Shows first on mobile */}
            <div className="order-1 lg:order-2">
              {/* Mobile: Inline card, Desktop: Sticky sidebar */}
              <div className="lg:sticky lg:top-24">
                <Card className="shadow-lg overflow-hidden">
                  <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-primary/5 to-purple-500/5">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Ticket className="w-5 h-5 text-primary" />
                      Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 sm:space-y-4">
                    {isPast ? (
                      <div className="text-center py-6 sm:py-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">This event has ended</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Check out other upcoming events</p>
                        <Button variant="outline" className="mt-4" onClick={() => router.push('/events')}>
                          Browse Events
                        </Button>
                      </div>
                    ) : (
                      <>
                        {event.tiers?.map((tier) => (
                          <TicketTierCard key={tier.id} tier={tier} />
                        ))}
                        
                        {/* Scroll indicator on mobile if there's more content below */}
                        <div className="flex items-center justify-center pt-2 lg:hidden text-muted-foreground">
                          <ChevronDown className="w-5 h-5 animate-bounce" />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
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
