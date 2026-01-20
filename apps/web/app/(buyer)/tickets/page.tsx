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
import { formatDate } from '@/lib/utils';
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
  const now = new Date();
  const upcomingTickets = tickets.filter(t => new Date(t.event?.startDate || 0) >= now);
  const pastTickets = tickets.filter(t => new Date(t.event?.startDate || 0) < now);

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
                    return (
                      <Card key={ticket.id} className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            {/* Main Content */}
                            <div className="flex-1 p-6">
                              <div className="flex items-start justify-between gap-4 mb-4">
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
                                    <Badge variant="outline" className="font-normal">
                                      {ticket.tier?.name}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">•</span>
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
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
                              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                                <Link href={`/events/${ticket.event?.slug}`}>
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Event
                                  </Button>
                                </Link>
                              </div>
                            </div>

                            {/* QR Code Section */}
                            <div className="w-full lg:w-56 p-6 bg-gradient-to-br from-muted/50 to-muted/30 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-border">
                              <div className="relative">
                                {ticket.qrCodeUrl ? (
                                  <div className="bg-white p-2 rounded-xl shadow-sm">
                                    <img src={ticket.qrCodeUrl} alt="QR Code" className="w-32 h-32 rounded-lg" />
                                  </div>
                                ) : (
                                  <div className="w-36 h-36 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <QrCode className="h-16 w-16 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-3 text-center font-medium">
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
                    return (
                      <Card key={ticket.id} className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <Ticket className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm line-clamp-1">{ticket.event?.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(ticket.event?.startDate || new Date())}</span>
                                <span>•</span>
                                <span>{ticket.tier?.name}</span>
                              </div>
                            </div>
                            <Badge variant={statusConfig.variant} className="text-xs">
                              {statusConfig.label}
                            </Badge>
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
