'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Ticket, RotateCcw, Settings } from 'lucide-react';

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

export default function RefundsPage() {
  const { isLoading: authLoading } = useAuth(true, ['BUYER']);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await api.getMyTickets();
        setTickets(data.filter((t: any) => t.tier?.refundEnabled && t.status === 'ACTIVE'));
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
          <h1 className="text-2xl font-bold">Refunds</h1>
        </div>
        
        <BuyerNav />
        
        <p className="text-muted-foreground mb-8">Select a ticket to request a refund. Refunds must be requested within 24 hours of purchase.</p>

        {loading ? (
          <p>Loading...</p>
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
            <h2 className="text-xl font-semibold mb-2 text-foreground">No eligible tickets</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              You don't have any tickets eligible for refund at the moment
            </p>
            <Link href="/tickets">
              <Button variant="outline" size="lg" className="gap-2">
                <Ticket className="h-4 w-4" />
                View My Tickets
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{ticket.event.title}</h3>
                      <p className="text-sm text-text-muted">{ticket.tier.name} - {formatCurrency(ticket.amountPaid)}</p>
                      <p className="text-sm text-text-muted">Purchased: {formatDate(ticket.createdAt)}</p>
                    </div>
                    <Button variant="outline">Request Refund</Button>
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
