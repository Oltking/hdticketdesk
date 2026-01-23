'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { BuyerNav } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatDate, cn } from '@/lib/utils';
import { getTierColorByPrice, getDefaultTierColor } from '@/lib/tier-colors';
import {
  Calendar,
  MapPin,
  QrCode,
  Ticket,
  Clock,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  ExternalLink
} from 'lucide-react';
import type { Ticket as TicketType } from '@/types';

export default function MyTicketsPage() {
  const { isLoading: authLoading } = useAuth(true, ['BUYER']);
  const { success, error } = useToast();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPayments, setCheckingPayments] = useState(false);

  const fetchTickets = async () => {
    try {
      const data = await api.getMyTickets();
      setTickets(data);
    } catch {
      // Silent fail - empty tickets will be shown
    }
  };

  useEffect(() => {
    const checkPendingAndFetch = async () => {
      setLoading(true);

      // First check for any pending payments
      setCheckingPayments(true);
      try {
        const result = await api.checkPendingPayments();

        // Show notification for each verified payment
        if (result.verified && result.verified.length > 0) {
          for (const verified of result.verified) {
            success(`Payment verified for "${verified.eventTitle}"! Your ticket is now available.`);
          }
        }
      } catch (err) {
        console.error('Failed to check pending payments:', err);
        // Don't show error to user, just log it
      } finally {
        setCheckingPayments(false);
      }

      // Then fetch tickets
      await fetchTickets();
      setLoading(false);
    };

    if (!authLoading) {
      checkPendingAndFetch();
    }
  }, [authLoading]);

  // Separate tickets into upcoming and past
  // A ticket is considered "past" only if:
  // 1. The event has an endDate and it has passed, OR
  // 2. The event only has startDate and it has passed
  const now = new Date();
  const upcomingTickets = tickets.filter(t => {
    const endDate = t.event?.endDate ? new Date(t.event.endDate) : null;
    const startDate = new Date(t.event?.startDate || 0);
    // If endDate exists, use it; otherwise fall back to startDate
    const relevantDate = endDate || startDate;
    return relevantDate >= now;
  });
  const pastTickets = tickets.filter(t => {
    const endDate = t.event?.endDate ? new Date(t.event.endDate) : null;
    const startDate = new Date(t.event?.startDate || 0);
    const relevantDate = endDate || startDate;
    return relevantDate < now;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { variant: 'success' as const, icon: CheckCircle2, label: 'Active', color: 'text-green-600' };
      case 'CHECKED_IN':
        return { variant: 'default' as const, icon: CheckCircle2, label: 'Checked In', color: 'text-blue-600' };
      case 'CANCELLED':
        return { variant: 'destructive' as const, icon: AlertCircle, label: 'Cancelled', color: 'text-red-600' };
      default:
        return { variant: 'secondary' as const, icon: Clock, label: status, color: 'text-muted-foreground' };
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 container py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              My Tickets
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {tickets.length > 0 
                ? `You have ${tickets.length} ticket${tickets.length > 1 ? 's' : ''} • ${upcomingTickets.length} upcoming`
                : 'Your purchased tickets will appear here'}
            </p>
          </div>
          {tickets.length > 0 && (
            <Link href="/events">
              <Button className="gap-2 shadow-md">
                <Sparkles className="h-4 w-4" />
                Find More Events
              </Button>
            </Link>
          )}
        </div>
        
        <BuyerNav />

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="w-full md:w-48 p-6 bg-muted/30 flex items-center justify-center">
                      <Skeleton className="h-32 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-32 h-32 mb-6">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-primary/20 rounded-full flex items-center justify-center">
                <Ticket className="h-12 w-12 text-primary/60" />
              </div>
            </div>
            <div className="w-20 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-6 rounded-full" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">No tickets yet</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">
              Your ticket collection is empty. Discover amazing events happening near you and start your journey!
            </p>
            <Link href="/events">
              <Button size="lg" className="gap-2 px-8">
                <Sparkles className="h-4 w-4" />
                Explore Events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Events Section */}
            {upcomingTickets.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-green-500/10">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <h2 className="font-semibold text-lg">Upcoming Events</h2>
                  <Badge variant="success" className="ml-2">{upcomingTickets.length}</Badge>
                </div>
                <div className="space-y-4">
                  {upcomingTickets.map((ticket) => {
                    const statusConfig = getStatusConfig(ticket.status);
                    const StatusIcon = statusConfig.icon;

                    // Get tier colors based on price ranking
                    const allTierPrices = ticket.event?.tiers?.map(t => t.price) || [];
                    const currentTierPrice = ticket.tier?.price || 0;
                    const tierColor = allTierPrices.length > 0
                      ? getTierColorByPrice(currentTierPrice, allTierPrices)
                      : getDefaultTierColor();

                    return (
                      <Card key={ticket.id} className={cn("overflow-hidden hover:shadow-lg transition-shadow border-l-4")} style={{ borderLeftColor: tierColor.borderHex }}>
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            {/* Main Content */}
                            <div className="flex-1 p-4">
                              {/* Tier Name - Prominent Display */}
                              <div
                                className="inline-block px-4 py-2 rounded-lg mb-3 border-2"
                                style={{
                                  backgroundColor: tierColor.bgHex,
                                  color: tierColor.textHex,
                                  borderColor: tierColor.borderHex
                                }}
                              >
                                <h2 className="text-2xl font-black uppercase tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                  {ticket.tier?.name}
                                </h2>
                                {tierColor.rank > 0 && (
                                  <p className="text-xs opacity-80 mt-1 uppercase tracking-wide">
                                    {tierColor.colorName} • Rank #{tierColor.rank}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/events/${ticket.event?.slug}`}
                                    className="group"
                                  >
                                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                                      {ticket.event?.title}
                                    </h3>
                                  </Link>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-muted-foreground">
                                      Ticket #{ticket.ticketNumber}
                                    </span>
                                  </div>
                                </div>
                                <Badge variant={statusConfig.variant} className="flex items-center gap-1 whitespace-nowrap">
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig.label}
                                </Badge>
                              </div>

                              {/* Event Details */}
                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span>{formatDate(ticket.event?.startDate || new Date())}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <span>{ticket.event?.isOnline ? 'Online Event' : ticket.event?.location || 'Venue TBA'}</span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                                <Link href={`/events/${ticket.event?.slug}`}>
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Event
                                  </Button>
                                </Link>
                              </div>
                            </div>

                            {/* QR Code Section */}
                            <div className="w-full lg:w-48 p-4 bg-gradient-to-br from-muted/30 to-muted/20 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-border">
                              <div className="relative">
                                {ticket.qrCodeUrl ? (
                                  <div className="bg-white p-2 rounded-lg shadow-md border-2 border-black">
                                    <img src={ticket.qrCodeUrl} alt="QR Code" className="w-28 h-28" />
                                  </div>
                                ) : (
                                  <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center shadow-md border-2 border-black">
                                    <QrCode className="h-14 w-14 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-foreground mt-3 text-center font-semibold">
                                Show QR at entrance
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Past Events Section */}
            {pastTickets.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h2 className="font-semibold text-lg text-muted-foreground">Past Events</h2>
                  <Badge variant="secondary" className="ml-2">{pastTickets.length}</Badge>
                </div>
                <div className="space-y-3">
                  {pastTickets.map((ticket) => {
                    const statusConfig = getStatusConfig(ticket.status);
                    // Only blur/grey out if the ticket was checked in (attended)
                    // Unchecked tickets from past events should still be visible normally
                    const wasAttended = ticket.status === 'CHECKED_IN';
                    const wasCancelled = ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED';

                    // Get tier colors based on price ranking
                    const allTierPrices = ticket.event?.tiers?.map(t => t.price) || [];
                    const currentTierPrice = ticket.tier?.price || 0;
                    const tierColor = allTierPrices.length > 0
                      ? getTierColorByPrice(currentTierPrice, allTierPrices)
                      : getDefaultTierColor();

                    return (
                      <Card
                        key={ticket.id}
                        className={cn(
                          "overflow-hidden transition-all",
                          wasAttended && "opacity-60 hover:opacity-90",
                          wasCancelled && "opacity-50",
                          !wasAttended && !wasCancelled && "hover:shadow-md"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs",
                                wasAttended && "bg-green-500/10 text-green-600",
                                wasCancelled && "bg-red-500/10 text-red-400"
                              )}
                              style={{
                                backgroundColor: !wasAttended && !wasCancelled ? tierColor.bgHex : undefined,
                                color: !wasAttended && !wasCancelled ? tierColor.textHex : undefined,
                                borderColor: tierColor.borderHex,
                                borderWidth: '2px',
                                borderStyle: 'solid'
                              }}
                            >
                              {wasAttended ? (
                                <CheckCircle2 className="h-7 w-7" />
                              ) : wasCancelled ? (
                                <Ticket className="h-7 w-7" />
                              ) : (
                                <span className="text-center leading-tight">#{tierColor.rank}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm line-clamp-1">{ticket.event?.title}</h3>
                              <div className="flex items-center gap-2 text-xs mt-0.5">
                                <Badge variant="outline" className="font-bold">{ticket.tier?.name}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(ticket.event?.startDate || new Date())}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={statusConfig.variant} className="text-xs">
                                {wasAttended ? 'Attended' : statusConfig.label}
                              </Badge>
                              {wasAttended && ticket.checkedInAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(ticket.checkedInAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Browse More Events CTA */}
            <section className="mt-12">
              <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Discover More Events</h3>
                        <p className="text-muted-foreground text-sm">
                          Find your next unforgettable experience
                        </p>
                      </div>
                    </div>
                    <Link href="/events">
                      <Button size="lg" className="gap-2 whitespace-nowrap">
                        Browse Events
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
