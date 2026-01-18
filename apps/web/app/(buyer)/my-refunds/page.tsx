'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { BuyerNav } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Ticket, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RefundRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  createdAt: string;
  ticket: {
    id: string;
    ticketNumber: string;
    amountPaid: number;
    event: { title: string };
    tier: { name: string };
  };
}

export default function RefundsPage() {
  const { isLoading: authLoading } = useAuth(true, ['BUYER']);
  const { success, error } = useToast();
  const [eligibleTickets, setEligibleTickets] = useState<any[]>([]);
  const [refundHistory, setRefundHistory] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState<{ ticketId: string; eventTitle: string; tierName: string; amount: number } | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const fetchData = async () => {
    try {
      const [ticketsData, refundsData] = await Promise.all([
        api.getMyTickets(),
        api.getMyRefunds().catch(() => []), // Gracefully handle if endpoint doesn't exist yet
      ]);
      
      // Filter tickets eligible for refund (refund enabled, active status, no pending refund)
      const pendingRefundTicketIds = refundsData
        .filter((r: RefundRequest) => r.status === 'PENDING')
        .map((r: RefundRequest) => r.ticket.id);
      
      setEligibleTickets(
        ticketsData.filter((t: any) => 
          t.tier?.refundEnabled && 
          t.status === 'ACTIVE' && 
          !pendingRefundTicketIds.includes(t.id)
        )
      );
      setRefundHistory(refundsData);
    } catch {
      // Silent fail - empty state will be shown
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const handleRequestRefund = async () => {
    if (!showRefundDialog || !refundReason.trim()) return;
    
    try {
      setRequestingId(showRefundDialog.ticketId);
      await api.requestRefund(showRefundDialog.ticketId, refundReason.trim());
      success('Refund request submitted successfully! We will review it shortly.');
      setShowRefundDialog(null);
      setRefundReason('');
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to submit refund request');
    } finally {
      setRequestingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Refunds</h1>
        </div>
        
        <BuyerNav />

        {/* Refund History Section */}
        {refundHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Refund History</h2>
            <div className="space-y-3">
              {refundHistory.map((refund) => (
                <Card key={refund.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{refund.ticket.event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {refund.ticket.tier.name} • Ticket #{refund.ticket.ticketNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {formatDate(refund.createdAt)}
                        </p>
                        {refund.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {refund.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(refund.ticket.amountPaid)}</span>
                        {getStatusBadge(refund.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Eligible Tickets Section */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Request a Refund</h2>
          <p className="text-muted-foreground mb-4">
            Select a ticket to request a refund. Refunds are typically processed within 3-5 business days.
          </p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : eligibleTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-lg">
              <div className="relative w-16 h-16 mb-4 opacity-20">
                <Image
                  src="/icon.svg"
                  alt="hdticketdesk"
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="text-lg font-medium mb-1">No eligible tickets</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">
                You don't have any tickets eligible for refund at the moment
              </p>
              <Link href="/tickets">
                <Button variant="outline" className="gap-2">
                  <Ticket className="h-4 w-4" />
                  View My Tickets
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {eligibleTickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{ticket.event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {ticket.tier.name} • Ticket #{ticket.ticketNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Purchased: {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(ticket.amountPaid)}</span>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRefundDialog({
                            ticketId: ticket.id,
                            eventTitle: ticket.event.title,
                            tierName: ticket.tier.name,
                            amount: ticket.amountPaid
                          })}
                        >
                          Request Refund
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Refund Request Dialog */}
        {showRefundDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Request Refund</h3>
              </div>
              
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="font-medium">{showRefundDialog.eventTitle}</p>
                <p className="text-sm text-muted-foreground">{showRefundDialog.tierName}</p>
                <p className="text-sm font-medium mt-1">Amount: {formatCurrency(showRefundDialog.amount)}</p>
              </div>

              <div className="mb-4">
                <Label htmlFor="reason">Reason for refund</Label>
                <Textarea
                  id="reason"
                  placeholder="Please tell us why you're requesting a refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Your refund request will be reviewed. If approved, the amount will be refunded to your original payment method within 3-5 business days.
              </p>

              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowRefundDialog(null);
                    setRefundReason('');
                  }}
                  disabled={requestingId === showRefundDialog.ticketId}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRequestRefund}
                  disabled={!refundReason.trim()}
                  loading={requestingId === showRefundDialog.ticketId}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
