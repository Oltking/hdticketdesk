'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { OrganizationNameDialog, useOrganizationNameCheck } from '@/components/ui/organization-name-dialog';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, TrendingUp, Calendar, DollarSign, QrCode, BarChart3, EyeOff, Trash2, AlertCircle, Eye, Info, X, Share2, Copy, Download } from 'lucide-react';
import type { Event } from '@/types';

export default function DashboardPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [balance, setBalance] = useState({ pending: 0, available: 0, withdrawn: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState<{ id: string; title: string } | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState<{ id: string; title: string } | null>(null);
  const [showAttendTip, setShowAttendTip] = useState(true);
  const [showOrgNameDialog, setShowOrgNameDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState<{ slug: string; title: string } | null>(null);
  
  // Check if organization name is needed
  const { needsOrganizationName } = useOrganizationNameCheck(user);
  
  // Show organization name dialog if needed
  useEffect(() => {
    if (!authLoading && needsOrganizationName) {
      setShowOrgNameDialog(true);
    }
  }, [authLoading, needsOrganizationName]);

  // Check if tip was previously dismissed
  useEffect(() => {
    const tipDismissed = localStorage.getItem('organizer-attend-tip-dismissed');
    if (tipDismissed === 'true') {
      setShowAttendTip(false);
    }
  }, []);

  const dismissAttendTip = () => {
    setShowAttendTip(false);
    localStorage.setItem('organizer-attend-tip-dismissed', 'true');
  };

  const fetchData = async () => {
    try {
      const [eventsData, balanceData] = await Promise.all([api.getMyEvents(), api.getBalance()]);
      setEvents(eventsData);
      setBalance(balanceData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user]);

  const handleUnpublish = async (eventId: string) => {
    try {
      setActionLoading(eventId);
      await api.unpublishEvent(eventId);
      success('Event unpublished! It is now a draft.');
      setShowUnpublishConfirm(null);
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to unpublish event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      setActionLoading(eventId);
      await api.deleteEvent(eventId);
      success('Event deleted successfully!');
      setShowDeleteConfirm(null);
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to delete event');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (eventId: string) => {
    try {
      setActionLoading(eventId);
      await api.publishEvent(eventId);
      success('Event published successfully! It is now live.');
      setShowPublishConfirm(null);
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to publish event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyLink = (slug: string) => {
    const eventUrl = `https://hdticketdesk.com/events/${slug}`;
    navigator.clipboard.writeText(eventUrl);
    success('Event link copied to clipboard!');
  };

  const handleDownloadQR = (slug: string, title: string) => {
    const eventUrl = `https://hdticketdesk.com/events/${slug}`;
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Generate QR code using a simple library-free approach
      // For production, you'd want to use a proper QR code library like 'qrcode'
      // For now, we'll use a QR code API
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(eventUrl)}`;

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);

        // Download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png`;
            a.click();
            URL.revokeObjectURL(url);
            success('QR code downloaded!');
          }
        });
      };
      img.src = qrApiUrl;
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-32" /></div>;

  const totalSold = events.reduce((sum, e) => sum + (e.totalTicketsSold || 0), 0);
  const totalRevenue = events.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-text-muted">Welcome back, {user?.firstName || 'Organizer'}!</p>
          </div>
          <Link href="/events/create"><Button className="bg-primary text-white"><Plus className="h-4 w-4 mr-2" />Create Event</Button></Link>
        </div>

        {/* Tip for organizers about buying tickets */}
        {showAttendTip && (
          <div className="flex items-start gap-3 p-3 mb-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-blue-700 dark:text-blue-300 flex-1">
              <span className="font-medium">Tip:</span> Want to attend events? Organizer accounts cannot purchase tickets. Please create a separate attendee account to buy or claim tickets for events.
            </p>
            <button
              onClick={dismissAttendTip}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard icon={<Calendar className="h-6 w-6" />} label="Total Events" value={events.length} loading={loading} />
          <StatCard icon={<QrCode className="h-6 w-6" />} label="Tickets Sold" value={totalSold} loading={loading} />
          <StatCard icon={<TrendingUp className="h-6 w-6" />} label="Total Revenue" value={formatCurrency(totalRevenue)} loading={loading} />
          <StatCard icon={<DollarSign className="h-6 w-6" />} label="Available Balance" value={formatCurrency(balance.available)} loading={loading} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Events</CardTitle>
            <Link href="/events/create"><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />New</Button></Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-20 h-20 mb-6 opacity-20">
                  <Image
                    src="/icon.svg"
                    alt="hdticketdesk"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-6 rounded-full" />
                <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                <p className="text-text-muted mb-6 text-center max-w-sm">
                  Create your first event and start selling tickets
                </p>
                <Link href="/events/create"><Button className="gap-2"><Plus className="h-4 w-4" />Create Your First Event</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-bg/50 transition gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>{event.status}</Badge>
                      </div>
                      <p className="text-sm text-text-muted">{formatDate(event.startDate)} • {event.totalTicketsSold || 0} sold</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        title="Share event"
                        onClick={() => setShareDialog({ slug: event.slug, title: event.title })}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Link href={`/events/${event.slug}/scan`}><Button variant="outline" size="sm" title="Scan tickets"><QrCode className="h-4 w-4" /></Button></Link>
                      <Link href={`/events/${event.slug}/analytics`}><Button variant="outline" size="sm" title="Analytics"><BarChart3 className="h-4 w-4" /></Button></Link>
                      <Link href={`/events/${event.slug}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
                      
                      {/* Unpublish button - only for published events with no sales */}
                      {event.status === 'PUBLISHED' && (event.totalTicketsSold || 0) === 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-warning text-warning hover:bg-warning/10"
                          title="Unpublish event"
                          onClick={() => setShowUnpublishConfirm({ id: event.id, title: event.title })}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Contact support hint for published events with sales */}
                      {event.status === 'PUBLISHED' && (event.totalTicketsSold || 0) > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1" title="Contact support to unpublish">
                          <AlertCircle className="h-3 w-3" />
                        </span>
                      )}
                      
                      {/* Publish button - only for draft events */}
                      {event.status === 'DRAFT' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-primary text-primary hover:bg-primary/10"
                          title="Publish event"
                          onClick={() => setShowPublishConfirm({ id: event.id, title: event.title })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Delete button - only for draft events */}
                      {event.status === 'DRAFT' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          title="Delete event"
                          onClick={() => setShowDeleteConfirm({ id: event.id, title: event.title })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unpublish Confirmation Dialog */}
        {showUnpublishConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Unpublish Event?</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to unpublish <strong>{showUnpublishConfirm.title}</strong>? 
                The event will be moved to draft status and will no longer be visible to the public.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUnpublishConfirm(null)}
                  disabled={actionLoading === showUnpublishConfirm.id}
                >
                  Cancel
                </Button>
                <Button 
                  variant="default"
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                  loading={actionLoading === showUnpublishConfirm.id}
                  onClick={() => handleUnpublish(showUnpublishConfirm.id)}
                >
                  Unpublish
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Publish Confirmation Dialog */}
        {showPublishConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Publish Event?</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to publish <strong>{showPublishConfirm.title}</strong>? 
                The event will be visible to the public and users can start purchasing tickets.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPublishConfirm(null)}
                  disabled={actionLoading === showPublishConfirm.id}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-primary text-white"
                  loading={actionLoading === showPublishConfirm.id}
                  onClick={() => handlePublish(showPublishConfirm.id)}
                >
                  Publish Event
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Delete Event?</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete <strong>{showDeleteConfirm.title}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={actionLoading === showDeleteConfirm.id}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  loading={actionLoading === showDeleteConfirm.id}
                  onClick={() => handleDelete(showDeleteConfirm.id)}
                >
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Share Event Dialog */}
        {shareDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Share Event</h3>
                <button
                  onClick={() => setShareDialog(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Event Title */}
                <div>
                  <p className="text-sm font-medium mb-1">Event</p>
                  <p className="text-sm text-muted-foreground">{shareDialog.title}</p>
                </div>

                {/* Event URL */}
                <div>
                  <p className="text-sm font-medium mb-2">Event Link</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://hdticketdesk.com/events/${shareDialog.slug}`}
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleCopyLink(shareDialog.slug)}
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                <div>
                  <p className="text-sm font-medium mb-2">QR Code</p>
                  <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-white">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://hdticketdesk.com/events/${shareDialog.slug}`)}`}
                      alt="Event QR Code"
                      className="w-48 h-48"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDownloadQR(shareDialog.slug, shareDialog.title)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR Code
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Share this link or QR code to promote your event
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Organization Name Dialog */}
        <OrganizationNameDialog
          open={showOrgNameDialog}
          onSuccess={() => {
            setShowOrgNameDialog(false);
            refreshUser?.();
          }}
        />
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: string | number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm text-text-muted">{label}</p>
            {loading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-bold">{value}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
