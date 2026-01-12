'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Calendar, MapPin, QrCode, Ticket, RotateCcw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket as TicketType } from '@/types';

const buyerNavItems = [
  { href: '/tickets', label: 'My Tickets', icon: Ticket },
  { href: '/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/account', label: 'Settings', icon: Settings },
];

function BuyerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 mb-8 p-1 bg-muted/50 rounded-lg w-fit">
      {buyerNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function MyTicketsPage() {
  const { isLoading: authLoading } = useAuth(true, ['BUYER']);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await api.getMyTickets();
        setTickets(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchTickets();
  }, [authLoading]);

  return (
    <>
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">My Tickets</h1>
        </div>
        
        <BuyerNav />

        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-24 h-24 mb-6 opacity-20">
              <Image
                src="/icon.svg"
                alt="hdticketdesk"
                fill
                className="object-contain"
              />
            </div>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-6 rounded-full" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">No tickets yet</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Discover amazing events and get your first ticket to start your journey
            </p>
            <Link href="/events">
              <Button size="lg" className="gap-2">
                <Ticket className="h-4 w-4" />
                Browse Events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{ticket.event?.title}</h3>
                          <p className="text-text-muted">{ticket.tier?.name}</p>
                        </div>
                        <Badge variant={ticket.status === 'ACTIVE' ? 'success' : ticket.status === 'CHECKED_IN' ? 'default' : 'secondary'}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(ticket.event?.startDate || new Date())}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{ticket.event?.isOnline ? 'Online' : ticket.event?.location}</span>
                      </div>
                      <p className="mt-4 text-sm text-text-muted">Ticket #{ticket.ticketNumber}</p>
                    </div>
                    <div className="w-full md:w-48 p-6 bg-bg flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-border">
                      {ticket.qrCodeUrl ? (
                        <img src={ticket.qrCodeUrl} alt="QR Code" className="w-32 h-32 mb-2" />
                      ) : (
                        <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center mb-2">
                          <QrCode className="h-12 w-12 text-text-muted" />
                        </div>
                      )}
                      <p className="text-xs text-text-muted">Show at entrance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
