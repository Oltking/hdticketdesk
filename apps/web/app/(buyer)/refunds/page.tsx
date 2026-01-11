'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';

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
        <h1 className="text-2xl font-bold mb-6">Request Refund</h1>
        <p className="text-text-muted mb-8">Select a ticket to request a refund. Refunds must be requested within 24 hours of purchase.</p>

        {loading ? (
          <p>Loading...</p>
        ) : tickets.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-text-muted">No eligible tickets for refund</CardContent></Card>
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
