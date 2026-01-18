'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RotateCcw, CheckCircle2, XCircle, DollarSign, AlertCircle, X, Search, TrendingUp } from 'lucide-react';

interface Refund {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  reason: string;
  refundAmount: number;
  processedAt?: string;
  processedBy?: string;
  rejectionNote?: string;
  ticket: {
    ticketNumber: string;
    event: {
      title: string;
      startDate: string;
      organizer: {
        title: string;
      };
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

export default function AdminRefundsPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const { success, error } = useToast();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; ticketNumber: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processDialog, setProcessDialog] = useState<{ id: string; amount: number } | null>(null);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRefunds = async () => {
    try {
      const data = await api.getAdminRefunds(page, 20);
      setRefunds(data.refunds || []);
      setTotalPages(data.totalPages || 1);
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
  }, [authLoading, page]);

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

  const handleProcess = async () => {
    if (!processDialog) return;

    try {
      setActionLoading(processDialog.id);
      await api.processRefund(processDialog.id);
      success('Refund processed successfully!');
      setProcessDialog(null);
      await fetchRefunds();
    } catch (err: any) {
      error(err.message || 'Failed to process refund');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-6" />
        </main>
      </div>
    );
  }

  const filteredRefunds = refunds.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = searchTerm === '' ||
      r.ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ticket.event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requester.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ticket.event.organizer.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    pending: refunds.filter(r => r.status === 'PENDING').length,
    approved: refunds.filter(r => r.status === 'APPROVED').length,
    processed: refunds.filter(r => r.status === 'PROCESSED').length,
    rejected: refunds.filter(r => r.status === 'REJECTED').length,
    totalAmount: refunds.reduce((sum, r) => sum + (r.status !== 'REJECTED' ? Number(r.refundAmount) : 0), 0),
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <RotateCcw className="h-6 w-6" />
              Refund Management
            </h1>
            <p className="text-muted-foreground">
              Manage and process all refund requests
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Processed</p>
                    <p className="text-2xl font-bold">{stats.processed}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket, event, buyer, or organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {['all', 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f as any)}
                  className="whitespace-nowrap"
                >
                  {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
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
                  <h3 className="text-lg font-semibold mb-2">No refund requests found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search' : 'No refund requests match your filter'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRefunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{refund.ticket.event.title}</h3>
                            <Badge
                              variant={
                                refund.status === 'PROCESSED'
                                  ? 'success'
                                  : refund.status === 'APPROVED'
                                  ? 'default'
                                  : refund.status === 'REJECTED'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {refund.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Organizer: {refund.ticket.event.organizer.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ticket #{refund.ticket.ticketNumber} • {refund.ticket.tier.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Buyer: {refund.requester.firstName} {refund.requester.lastName} ({refund.requester.email})
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

                      <div className="flex gap-2 pt-2 flex-wrap">
                        {refund.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              loading={actionLoading === refund.id}
                              onClick={() => handleApprove(refund.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
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
                          </>
                        )}

                        {refund.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            loading={actionLoading === refund.id}
                            onClick={() => setProcessDialog({ id: refund.id, amount: refund.refundAmount })}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Process Refund
                          </Button>
                        )}

                        {refund.status === 'PROCESSED' && refund.processedAt && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Processed on {formatDate(refund.processedAt)}</span>
                            {refund.processedBy && <span>by {refund.processedBy}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
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
                  Provide a reason for rejecting ticket #{rejectDialog.ticketNumber}:
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

          {/* Process Dialog */}
          {processDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Process Refund
                  </h3>
                  <button
                    onClick={() => setProcessDialog(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Confirm processing refund of {formatCurrency(processDialog.amount)} to the buyer.
                </p>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This will initiate the payment reversal through Paystack. The buyer will receive their refund within 5-10 business days.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setProcessDialog(null)}
                    disabled={actionLoading === processDialog.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    loading={actionLoading === processDialog.id}
                    onClick={handleProcess}
                  >
                    Process Refund
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
