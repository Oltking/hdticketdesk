'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RotateCcw, CheckCircle2, XCircle, Clock, AlertCircle, X } from 'lucide-react';

interface Refund {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  reason: string;
  refundAmount: number;
  processedAt?: string;
  rejectionNote?: string;
  ticket: {
    ticketNumber: string;
    event: {
      title: string;
      startDate: string;
    };
    tier: {
      name: string;
    };
    buyerEmail: string;
  };
  requester: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function OrganizerRefundsPage() {
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; ticketNumber: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'>('all');

  const fetchRefunds = async () => {
    try {
      const data = await api.getOrganizerRefunds();
      setRefunds(data);
    } catch (err) {
      console.error('Failed to fetch refunds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchRefunds();
    }
  }, [authLoading]);

  const handleApprove = async (refundId: string) => {
    try {
      setActionLoading(refundId);
      await api.approveRefund(refundId);
      success('Refund approved successfully!');
      await fetchRefunds();
    } catch (err: any) {
      error(err.message || 'Failed to approve refund');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectionReason.trim()) {
      error('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(rejectDialog.id);
      await api.rejectRefund(rejectDialog.id, rejectionReason);
      success('Refund rejected');
      setRejectDialog(null);
      setRejectionReason('');
      await fetchRefunds();
    } catch (err: any) {
      error(err.message || 'Failed to reject refund');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-6" />
        </main>
      </div>
    );
  }

  const filteredRefunds = filter === 'all' ? refunds : refunds.filter(r => r.status === filter);
  const pendingCount = refunds.filter(r => r.status === 'PENDING').length;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <RotateCcw className="h-6 w-6" />
                Refund Requests
              </h1>
              <p className="text-muted-foreground">
                Manage refund requests for your events
              </p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingCount} Pending
              </Badge>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {['all', 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f as any)}
                className="whitespace-nowrap"
              >
                {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                {f !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {refunds.filter(r => r.status === f).length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Refund Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
              ) : filteredRefunds.length === 0 ? (
                <div className="text-center py-12">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No refund requests</h3>
                  <p className="text-muted-foreground">
                    {filter === 'all'
                      ? 'No refund requests have been made yet'
                      : `No ${filter.toLowerCase()} refund requests`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRefunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{refund.ticket.event.title}</h3>
                            <Badge
                              variant={
                                refund.status === 'APPROVED' || refund.status === 'PROCESSED'
                                  ? 'success'
                                  : refund.status === 'REJECTED'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {refund.status === 'PROCESSED' ? 'PROCESSED' : refund.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Ticket #{refund.ticket.ticketNumber} • {refund.ticket.tier.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Buyer: {refund.requester.firstName} {refund.requester.lastName} ({refund.ticket.buyerEmail})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatCurrency(refund.refundAmount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Requested: {formatDate(refund.createdAt)}
                          </p>
                        </div>
                      </div>

                      {refund.reason && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-1">Reason:</p>
                          <p className="text-sm text-muted-foreground">{refund.reason}</p>
                        </div>
                      )}

                      {refund.rejectionNote && (
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <p className="text-sm font-medium mb-1 text-destructive">Rejection Reason:</p>
                          <p className="text-sm text-destructive/80">{refund.rejectionNote}</p>
                        </div>
                      )}

                      {refund.status === 'PENDING' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            loading={actionLoading === refund.id}
                            onClick={() => handleApprove(refund.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve Refund
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === refund.id}
                            onClick={() => setRejectDialog({ id: refund.id, ticketNumber: refund.ticket.ticketNumber })}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {refund.status === 'APPROVED' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                          <Clock className="h-4 w-4" />
                          <span>Approved • Pending processing by admin</span>
                        </div>
                      )}

                      {refund.status === 'PROCESSED' && refund.processedAt && (
                        <div className="flex items-center gap-2 text-sm text-green-600 pt-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Processed on {formatDate(refund.processedAt)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reject Dialog */}
          {rejectDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Reject Refund Request
                  </h3>
                  <button
                    onClick={() => {
                      setRejectDialog(null);
                      setRejectionReason('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Please provide a reason for rejecting this refund request for ticket #{rejectDialog.ticketNumber}:
                </p>

                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="mb-4"
                  rows={4}
                />

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectDialog(null);
                      setRejectionReason('');
                    }}
                    disabled={actionLoading === rejectDialog.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    loading={actionLoading === rejectDialog.id}
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                  >
                    Reject Refund
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
