'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layouts/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  CheckCircle, 
  XCircle, 
  Search, 
  Loader2, 
  ScanLine, 
  QrCode, 
  ArrowLeft, 
  UserCheck, 
  Clock, 
  Ticket,
  BarChart3,
  Users
} from 'lucide-react';

export default function ScanPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [scanning, setScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; ticket?: any } | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<any>(null);
  const lastScannedRef = useRef<string | null>(null);
  // Track recently processed codes to prevent rapid duplicate submissions
  const recentlyProcessedRef = useRef<Set<string>>(new Set());

  // Fetch event to get the ID from slug
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const event = await api.getEventBySlug(slug as string);
        setEventId(event.id || event.data?.id);
        setEventTitle(event.title || event.data?.title || '');
      } catch (err) {
        console.error('Failed to fetch event:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop?.();
      }
    };
  }, []);

  const startScanner = async () => {
    setScanning(true);
    setLastResult(null);
    lastScannedRef.current = null;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scannerRef.current = new Html5Qrcode('scanner');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          // Prevent duplicate scans of the same QR code while processing
          if (isProcessing || lastScannedRef.current === decodedText) {
            return;
          }
          lastScannedRef.current = decodedText;
          await handleScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      error('Failed to start camera');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanning(false);
    lastScannedRef.current = null;
  };

  const resetForNextScan = () => {
    setLastResult(null);
    lastScannedRef.current = null;
  };

  const handleScan = async (code: string) => {
    if (!eventId) {
      error('Event not loaded yet');
      return;
    }
    
    // PROTECTION 1: Prevent concurrent processing
    if (isProcessing) {
      return;
    }

    // PROTECTION 2: Prevent rapid duplicate scans of the same code (within 3 seconds)
    const codeKey = code.toUpperCase().trim();
    if (recentlyProcessedRef.current.has(codeKey)) {
      error('This code was just scanned. Please wait a moment.');
      return;
    }
    
    // Set processing state to prevent multiple scans
    setIsProcessing(true);
    
    // Mark code as recently processed
    recentlyProcessedRef.current.add(codeKey);
    
    // Clear from recently processed after 3 seconds
    setTimeout(() => {
      recentlyProcessedRef.current.delete(codeKey);
    }, 3000);
    
    try {
      // Use scanQr which validates AND checks in the ticket in one call
      const result = await api.scanQr({ qrCode: code, eventId });
      
      if (result.success) {
        setLastResult({ success: true, message: result.message || 'Check-in successful!', ticket: result.ticket });
        if (result.ticket) {
          // Keep only last 5 recent scans
          setRecentScans(prev => [{ ...result.ticket, time: new Date() }, ...prev.slice(0, 4)]);
        }
        success(result.message || 'Check-in successful!');
      } else {
        // Ticket validation failed (already checked in, wrong event, etc.)
        setLastResult({ success: false, message: result.message || 'Invalid ticket', ticket: result.ticket });
        error(result.message || 'Invalid ticket');
      }
    } catch (err: any) {
      setLastResult({ success: false, message: err.message || 'Invalid ticket' });
      error(err.message || 'Invalid ticket');
    } finally {
      setIsProcessing(false);
      // Auto-dismiss result after 5 seconds
      setTimeout(() => {
        setLastResult(null);
        lastScannedRef.current = null;
      }, 5000);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleScan(manualCode);
    setManualCode('');
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[500px]" />
            <div className="space-y-6">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-2 -ml-2 gap-1 text-muted-foreground"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              QR Scanner
            </h1>
            {eventTitle && (
              <p className="text-muted-foreground mt-1">{eventTitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/events/${slug}/agents`}>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Manage Agents</span>
                <span className="sm:hidden">Agents</span>
              </Button>
            </Link>
            <Link href={`/events/${slug}/analytics`}>
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">View Analytics</span>
                <span className="sm:hidden">Analytics</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <UserCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Checked In Today</p>
                  <p className="text-2xl font-bold text-green-600">{recentScans.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Session</p>
                  <p className="text-2xl font-bold">{recentScans.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${scanning ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${scanning ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                  <Camera className={`h-5 w-5 ${scanning ? 'text-green-500' : 'text-yellow-500'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scanner Status</p>
                  <p className={`text-lg font-bold ${scanning ? 'text-green-600' : 'text-yellow-600'}`}>
                    {scanning ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Camera Scanner
              </CardTitle>
              <CardDescription>Point your camera at a ticket QR code to check in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full aspect-square bg-black/5 rounded-lg overflow-hidden mb-4">
                <div id="scanner" className="w-full h-full" />
                {/* QR Scanner placeholder when camera is not active */}
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
                    <div className="relative">
                      <div className="w-32 h-32 border-4 border-primary/30 rounded-2xl flex items-center justify-center">
                        <QrCode className="h-16 w-16 text-primary/40" />
                      </div>
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    </div>
                    <p className="mt-6 text-sm text-muted-foreground text-center px-4">
                      Click the button below to start scanning
                    </p>
                  </div>
                )}
              </div>
              <Button 
                onClick={scanning ? stopScanner : startScanner} 
                className={`w-full h-12 text-base gap-2 ${scanning ? '' : 'bg-primary'}`}
                variant={scanning ? 'destructive' : 'default'}
              >
                {scanning ? (
                  <>
                    <XCircle className="h-5 w-5" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    Start Scanner
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Manual Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Manual Entry
                </CardTitle>
                <CardDescription>Enter a ticket code manually to check in</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <Input 
                    value={manualCode} 
                    onChange={(e) => setManualCode(e.target.value)} 
                    placeholder="Enter ticket number or QR code" 
                    className="h-11"
                  />
                  <Button type="submit" className="h-11 px-6">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Processing State */}
            {isProcessing && (
              <Card className="border-2 border-primary bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Processing...</p>
                      <p className="text-muted-foreground">Validating ticket</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Result Display */}
            {lastResult && !isProcessing && (
              <Card className={`border-2 ${lastResult.success ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${lastResult.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {lastResult.success ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold text-lg ${lastResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {lastResult.message}
                      </p>
                      {lastResult.ticket && (
                        <p className="text-muted-foreground">
                          {lastResult.ticket.buyerFirstName} {lastResult.ticket.buyerLastName} 
                          {lastResult.ticket.tier?.name && ` • ${lastResult.ticket.tier.name}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Auto-dismissing in 5 seconds...
                    </p>
                    {scanning && (
                      <Button onClick={resetForNextScan} size="sm" variant="outline">
                        Scan Next
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Scans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Recent Check-ins
                </CardTitle>
                <CardDescription>Latest attendees checked in this session</CardDescription>
              </CardHeader>
              <CardContent>
                {recentScans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <Ticket className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm text-center">
                      No check-ins yet. Start scanning to see recent activity.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentScans.map((scan, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{scan.buyerFirstName} {scan.buyerLastName}</p>
                            <p className="text-xs text-muted-foreground">{scan.tier?.name}</p>
                          </div>
                        </div>
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Checked In
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
