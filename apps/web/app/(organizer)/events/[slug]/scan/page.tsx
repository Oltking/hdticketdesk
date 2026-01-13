'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, XCircle, Search, Loader2, ScanLine } from 'lucide-react';

export default function ScanPage() {
  const { slug } = useParams();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [scanning, setScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; ticket?: any } | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const lastScannedRef = useRef<string | null>(null);

  // Fetch event to get the ID from slug
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const event = await api.getEventBySlug(slug as string);
        setEventId(event.id || event.data?.id);
      } catch (err) {
        console.error('Failed to fetch event:', err);
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
    
    // Set processing state to prevent multiple scans
    setIsProcessing(true);
    
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

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <h1 className="text-2xl font-bold mb-6">QR Scanner</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Camera Scanner</CardTitle></CardHeader>
            <CardContent>
              <div className="relative w-full aspect-square bg-black/5 rounded-lg overflow-hidden mb-4">
                <div id="scanner" className="w-full h-full" />
                {/* QR Scanner placeholder when camera is not active */}
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
                    <div className="relative">
                      <ScanLine className="h-24 w-24 text-primary/40" strokeWidth={1} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-2 border-dashed border-primary/40 rounded-lg" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground text-center px-4">
                      Click "Start Scanner" to open camera and scan QR codes
                    </p>
                  </div>
                )}
              </div>
              <Button onClick={scanning ? stopScanner : startScanner} className="w-full" variant={scanning ? 'destructive' : 'default'}>
                {scanning ? 'Stop Scanner' : 'Start Scanner'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Manual Entry</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Enter ticket code" />
                  <Button type="submit"><Search className="h-4 w-4" /></Button>
                </form>
              </CardContent>
            </Card>

            {isProcessing && (
              <Card className="border-primary">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <div>
                      <p className="font-bold text-lg">Processing...</p>
                      <p className="text-text-muted">Validating ticket</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {lastResult && !isProcessing && (
              <Card className={lastResult.success ? 'border-success border-2' : 'border-danger border-2'}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {lastResult.success ? <CheckCircle className="h-12 w-12 text-success" /> : <XCircle className="h-12 w-12 text-danger" />}
                    <div className="flex-1">
                      <p className="font-bold text-lg">{lastResult.message}</p>
                      {lastResult.ticket && <p className="text-text-muted">{lastResult.ticket.buyerFirstName} {lastResult.ticket.buyerLastName} - {lastResult.ticket.tier?.name}</p>}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Auto-dismissing in 5 seconds...</p>
                    {scanning && (
                      <Button onClick={resetForNextScan} size="sm" variant="outline">
                        Scan Next
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Recent Scans</CardTitle></CardHeader>
              <CardContent>
                {recentScans.length === 0 ? (
                  <p className="text-text-muted text-center py-4">No scans yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentScans.map((scan, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                        <div>
                          <p className="font-medium">{scan.buyerFirstName} {scan.buyerLastName}</p>
                          <p className="text-sm text-text-muted">{scan.tier?.name}</p>
                        </div>
                        <Badge variant="success">Checked In</Badge>
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
