'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { OrganizationNameDialog, useOrganizationNameCheck } from '@/components/ui/organization-name-dialog';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  QrCode,
  BarChart3,
  EyeOff,
  Trash2,
  AlertCircle,
  Eye,
  Info,
  X,
  Ticket,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Users,
  Copy,
  Download,
  Share2,
  Ban,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

      // Generate QR code using external API
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

  if (authLoading) return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </main>
    </div>
  );

  const totalSold = events.reduce((sum, e) => sum + (e.totalTicketsSold || 0), 0);
  const totalRevenue = events.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
  const publishedEvents = events.filter(e => e.status === 'PUBLISHED').length;
  const draftEvents = events.filter(e => e.status === 'DRAFT').length;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-medium text-foreground">{user?.firstName || 'Organizer'}</span>! Here's your overview.
            </p>
          </div>
          <Link href="/events/create">
            <Button className="bg-primary text-white gap-2 h-11 px-6">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Tip for organizers about buying tickets */}
        {showAttendTip && (
          <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">Tip for Organizers</p>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                Want to attend events? Organizer accounts cannot purchase tickets. Please create a separate attendee account to buy or claim tickets for events.
              </p>
            </div>
            <button
              onClick={dismissAttendTip}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-5">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                  {loading ? (
                    <Skeleton className="h-6 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{events.length}</p>
                  )}
                </div>
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </div>
              {!loading && (
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {publishedEvents} Published
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {draftEvents} Draft
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tickets Sold</p>
                  {loading ? (
                    <Skeleton className="h-6 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{totalSold}</p>
                  )}
                </div>
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Ticket className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              {!loading && totalSold > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Across all your events
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                  )}
                </div>
                <div className="p-2 rounded-full bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatCurrency(balance.available)}</p>
                  )}
                </div>
                <div className="p-2 rounded-full bg-yellow-500/10">
                  <DollarSign className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
              {!loading && balance.pending > 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatCurrency(balance.pending)} pending
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          <Link href="/payments" className="block">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Payment History</p>
                  <p className="text-xs text-muted-foreground truncate">View all transactions</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/payouts" className="block">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-green-500/10">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Payouts</p>
                  <p className="text-xs text-muted-foreground truncate">Withdraw your earnings</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings" className="block">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground truncate">Manage your profile</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Events List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Your Events
              </CardTitle>
              <CardDescription className="mt-1">Manage and track your events</CardDescription>
            </div>
            <Link href="/events/create">
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 bg-primary/10 rounded-full" />
                  <div className="absolute inset-4 bg-primary/20 rounded-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">No events yet</h3>
                <p className="text-muted-foreground text-sm mb-6 text-center max-w-sm">
                  Create your first event and start selling tickets to your audience
                </p>
                <Link href="/events/create">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Sort events: Active/Upcoming first, then Ended */}
                {[...events].sort((a, b) => {
                  const now = new Date();
                  const aEnd = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
                  const bEnd = b.endDate ? new Date(b.endDate) : new Date(b.startDate);
                  const aEnded = aEnd < now;
                  const bEnded = bEnd < now;
                  
                  // Ended events go to bottom
                  if (aEnded && !bEnded) return 1;
                  if (!aEnded && bEnded) return -1;
                  
                  // Sort by start date
                  return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                }).map((event) => {
                  // Check if event has ended
                  const now = new Date();
                  const eventEnd = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
                  const isEnded = eventEnd < now;
                  const eventStart = new Date(event.startDate);
                  const isLive = eventStart <= now && eventEnd >= now;
                  
                  // Format date and time separately for better mobile layout
                  const dateStr = eventStart.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: eventStart.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                  });
                  const timeStr = eventStart.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit'
                  });
                  
                  return (
                    <div 
                      key={event.id} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-colors gap-4",
                        isEnded 
                          ? "bg-muted/30 border-muted opacity-75 hover:opacity-100" 
                          : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        {/* Title and badges row */}
                        <div className="flex items-start sm:items-center gap-2 flex-wrap">
                          <h3 className={cn(
                            "font-semibold truncate",
                            isEnded && "text-muted-foreground"
                          )}>
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Status Badge */}
                            {isEnded ? (
                              <Badge variant="secondary" className="flex-shrink-0 bg-gray-500/10 text-gray-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                ENDED
                              </Badge>
                            ) : isLive ? (
                              <Badge className="flex-shrink-0 bg-red-500 text-white animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5" />
                                LIVE
                              </Badge>
                            ) : (
                              <Badge 
                                variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}
                                className="flex-shrink-0"
                              >
                                {event.status === 'PUBLISHED' ? (
                                  <><CheckCircle2 className="h-3 w-3 mr-1" />LIVE</>
                                ) : (
                                  <><Clock className="h-3 w-3 mr-1" />DRAFT</>
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Event info - improved mobile layout */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          {/* Date */}
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{dateStr}</span>
                          </span>
                          
                          {/* Time */}
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{timeStr}</span>
                          </span>
                          
                          {/* Tickets sold */}
                          <span className={cn(
                            "flex items-center gap-1.5",
                            isEnded && "text-muted-foreground/70"
                          )}>
                            <Ticket className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{event.totalTicketsSold || 0} {isEnded ? 'attended' : 'sold'}</span>
                          </span>
                          
                          {/* Revenue */}
                          {(event.totalRevenue || 0) > 0 && (
                            <span className={cn(
                              "flex items-center gap-1.5",
                              isEnded ? "text-muted-foreground/70" : "text-green-600"
                            )}>
                              <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{formatCurrency(event.totalRevenue || 0)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Scan button - always available for check-in review */}
                        <Link href={`/events/${event.slug}/scan`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title={isEnded ? "View check-ins" : "Scan tickets"} 
                            className={cn(
                              "gap-1.5",
                              isEnded && "opacity-70"
                            )}
                          >
                            <QrCode className="h-4 w-4" />
                            <span className="hidden sm:inline">{isEnded ? 'Check-ins' : 'Scan'}</span>
                          </Button>
                        </Link>
                        
                        {/* Analytics - always available */}
                        <Link href={`/events/${event.slug}/analytics`}>
                          <Button variant="outline" size="sm" title="Analytics" className="gap-1.5">
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Stats</span>
                          </Button>
                        </Link>
                        
                        {/* Edit button - disabled for ended events */}
                        {isEnded ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled
                            className="opacity-50 cursor-not-allowed gap-1.5"
                            title="Cannot edit ended events"
                          >
                            <Lock className="h-4 w-4" />
                            <span className="hidden sm:inline">Locked</span>
                          </Button>
                        ) : (
                          <Link href={`/events/${event.slug}/edit`}>
                            <Button variant="outline" size="sm">Edit</Button>
                          </Link>
                        )}
                        
                        {/* Share button - for published events (even ended) */}
                        {event.status === 'PUBLISHED' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5"
                            title="Share event"
                            onClick={() => setShareDialog({ slug: event.slug, title: event.title })}
                          >
                            <Share2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Share</span>
                          </Button>
                        )}
                        
                        {/* Unpublish button - only for published events with no sales and not ended */}
                        {event.status === 'PUBLISHED' && (event.totalTicketsSold || 0) === 0 && !isEnded && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10"
                            title="Unpublish event"
                            onClick={() => setShowUnpublishConfirm({ id: event.id, title: event.title })}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Contact support hint for published events with sales */}
                        {event.status === 'PUBLISHED' && (event.totalTicketsSold || 0) > 0 && !isEnded && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1" title="Contact support to unpublish">
                            <AlertCircle className="h-3 w-3" />
                          </span>
                        )}
                        
                        {/* Publish button - only for draft events (not ended) */}
                        {event.status === 'DRAFT' && !isEnded && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-green-500 text-green-600 hover:bg-green-500/10"
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
                            className="border-red-500 text-red-600 hover:bg-red-500/10"
                            title="Delete event"
                            onClick={() => setShowDeleteConfirm({ id: event.id, title: event.title })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
