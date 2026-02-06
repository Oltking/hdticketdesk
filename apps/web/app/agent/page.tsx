'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  LogOut,
  Calendar,
  MapPin,
  UserCheck,
  AlertCircle,
  Ticket,
  History,
  Zap,
  Volume2,
  VolumeX,
  RotateCcw,
  Camera,
  CameraOff,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface EventInfo {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  coverImage: string | null;
  status: string;
}

interface CheckInResult {
  success: boolean;
  message: string;
  ticket?: {
    ticketNumber: string;
    tierName: string;
    buyerName: string;
    checkedInAt?: string;
    checkedInBy?: string;
    status?: string;
  };
  checkedInAt?: string;
  checkedInBy?: string;
}

interface RecentCheckIn {
  ticketNumber: string;
  buyerName: string;
  tierName: string;
  timestamp: Date;
  success: boolean;
}

export default function AgentPortalPage() {
  const { success, error } = useToast();
  
  // Access code state
  const [accessCode, setAccessCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  
  // Session state
  const [isActivated, setIsActivated] = useState(false);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [agentLabel, setAgentLabel] = useState<string | null>(null);
  const [sessionCheckInCount, setSessionCheckInCount] = useState(0);
  
  // Scanning state
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Camera scanner refs
  const scannerRef = useRef<any>(null);
  const lastScannedRef = useRef<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Track recently scanned codes to prevent rapid duplicate submissions
  const recentlyScannedRef = useRef<Set<string>>(new Set());
  const scanLockRef = useRef<boolean>(false);

  // Initialize audio refs
  useEffect(() => {
    // Create audio elements for feedback sounds
    if (typeof window !== 'undefined') {
      successSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRcACS+T1+uxfzkFGzqN1/C5iUMOJzuK1PC8i0YRLDqI0u+7ikcULzqH0e66iUcVMTqG0O25iEYVMzqF0Oy4h0UVNDuE0Ou3hkQUNTuD0Oq2hUMTNjuC0Om1hEITNzuB0Oi0g0ETODyA0OezgkASOTx/0OayfT8SOjx+0OWxfD4ROzx90OSwe0USPDx80OOveEMSPTx70OKudkISPjx60OGtdUESPzx50OCsdEASQDx40N+rcj8SQTx30N6qcT4SQjx20N2pbj0SQzx10NsAaa8=');
      errorSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAABhYGBkampub3R2eHl6enp5eHd1c3BsaGRfWlVQSkVAOzYxLCgjHxsYFRMREA8PDw8QERIUFhkdISYrMDU7QUZLUFFXXF9jZ2tvc3Z4ent7e3t6eXd1cnBtaWViXltYVVNRUE9OTk5OT1BRU1VYWl1gY2Zpa2xucHFyc3R0dXV1dXV0dHNycXBvbmxramloZ2ZmZWVlZWVlZWZmZ2hpamtsbW5vcHFycnNzdHR0dHR0c3NycXBwb25tbGtqaWloZ2dmZmVlZWVlZWVmZmdoaWprbG1ub3BxcnJzc3R0dHR0dHNzcnFwcG9ubWxramloZ2ZmZWVlZWVlZQ==');
    }
  }, []);

  // Play feedback sound
  const playSound = useCallback((isSuccess: boolean) => {
    if (!soundEnabled) return;
    
    try {
      const audio = isSuccess ? successSoundRef.current : errorSoundRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {}); // Ignore autoplay errors
      }
      
      // Vibrate on mobile if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(isSuccess ? [100] : [100, 50, 100]);
      }
    } catch (e) {
      // Ignore audio errors
    }
  }, [soundEnabled]);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('agentSession');
      const savedSound = localStorage.getItem('agentSoundEnabled');
      
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
      
      if (savedSession) {
        const session = JSON.parse(savedSession);
        setAccessCode(session.accessCode);
        setEventInfo(session.eventInfo);
        setAgentLabel(session.agentLabel);
        setIsActivated(true);
        setSessionCheckInCount(session.checkInCount || 0);
        setRecentCheckIns(session.recentCheckIns || []);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Focus on QR input when activated
  useEffect(() => {
    if (isActivated && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActivated]);

  // Save sound preference
  useEffect(() => {
    try {
      localStorage.setItem('agentSoundEnabled', String(soundEnabled));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [soundEnabled]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop?.().catch(() => {});
      }
    };
  }, []);

  // Start camera scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scannerRef.current = new Html5Qrcode('agent-scanner');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText: string) => {
          // Prevent duplicate scans while processing
          if (scanLockRef.current || lastScannedRef.current === decodedText) {
            return;
          }
          lastScannedRef.current = decodedText;
          // Process the scanned code
          await handleCameraScan(decodedText);
        },
        () => {} // Ignore scan failures
      );
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.message || 'Failed to start camera. Please check permissions.');
      setCameraActive(false);
    }
  };

  // Stop camera scanner
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    lastScannedRef.current = null;
  };

  // Handle camera scan result
  const handleCameraScan = async (code: string) => {
    // Reuse the same logic as manual scan
    setQrInput(code);
    
    // PROTECTION: Prevent rapid duplicate scans
    const codeKey = code.toUpperCase();
    if (recentlyScannedRef.current.has(codeKey)) {
      return;
    }

    try {
      scanLockRef.current = true;
      setScanning(true);
      setLastResult(null);
      
      recentlyScannedRef.current.add(codeKey);
      setTimeout(() => {
        recentlyScannedRef.current.delete(codeKey);
      }, 3000);
      
      const result = await api.agentCheckIn(code, accessCode);
      setLastResult(result);
      
      if (result.ticket) {
        const newCheckIn: RecentCheckIn = {
          ticketNumber: result.ticket.ticketNumber,
          buyerName: result.ticket.buyerName,
          tierName: result.ticket.tierName,
          timestamp: new Date(),
          success: result.success,
        };
        
        const updatedRecent = [newCheckIn, ...recentCheckIns].slice(0, 10);
        setRecentCheckIns(updatedRecent);
        
        try {
          const savedSession = localStorage.getItem('agentSession');
          if (savedSession) {
            const session = JSON.parse(savedSession);
            session.recentCheckIns = updatedRecent;
            if (result.success) {
              session.checkInCount = sessionCheckInCount + 1;
            }
            localStorage.setItem('agentSession', JSON.stringify(session));
          }
        } catch (e) {}
      }
      
      if (result.success) {
        setSessionCheckInCount((prev) => prev + 1);
        playSound(true);
      } else {
        playSound(false);
      }
      
      setQrInput('');
    } catch (err: any) {
      setLastResult({
        success: false,
        message: err.message || 'Failed to check in ticket',
      });
      playSound(false);
    } finally {
      scanLockRef.current = false;
      setScanning(false);
      // Allow scanning the same code again after 2 seconds
      setTimeout(() => {
        lastScannedRef.current = null;
      }, 2000);
    }
  };

  const handleActivate = async () => {
    const code = accessCode.toUpperCase().trim();
    if (code.length !== 9) {
      setActivationError('Please enter a valid 9-character access code');
      return;
    }

    try {
      setActivating(true);
      setActivationError(null);
      const result = await api.activateAgentCode(code);
      
      setEventInfo(result.event);
      setAgentLabel(result.label);
      setIsActivated(true);
      setSessionCheckInCount(result.checkInCount);
      
      // Save session to localStorage
      localStorage.setItem('agentSession', JSON.stringify({
        accessCode: code,
        eventInfo: result.event,
        agentLabel: result.label,
        checkInCount: result.checkInCount,
        recentCheckIns: [],
      }));
      
      success('Access code activated! You can now scan tickets.');
      playSound(true);
    } catch (err: any) {
      setActivationError(err.message || 'Invalid access code');
      playSound(false);
    } finally {
      setActivating(false);
    }
  };

  const handleLogout = () => {
    setIsActivated(false);
    setEventInfo(null);
    setAgentLabel(null);
    setAccessCode('');
    setQrInput('');
    setLastResult(null);
    setSessionCheckInCount(0);
    setRecentCheckIns([]);
    setActivationError(null);
    localStorage.removeItem('agentSession');
  };

  const handleScan = async () => {
    const code = qrInput.trim();
    if (!code) {
      error('Please enter or scan a ticket QR code');
      return;
    }

    // PROTECTION 1: Prevent concurrent submissions
    if (scanLockRef.current || scanning) {
      return;
    }

    // PROTECTION 2: Prevent rapid duplicate scans of the same code (within 3 seconds)
    const codeKey = code.toUpperCase();
    if (recentlyScannedRef.current.has(codeKey)) {
      error('This code was just scanned. Please wait a moment.');
      return;
    }

    try {
      // Acquire lock
      scanLockRef.current = true;
      setScanning(true);
      setLastResult(null);
      
      // Mark code as recently scanned
      recentlyScannedRef.current.add(codeKey);
      
      // Clear from recently scanned after 3 seconds
      setTimeout(() => {
        recentlyScannedRef.current.delete(codeKey);
      }, 3000);
      
      const result = await api.agentCheckIn(code, accessCode);
      setLastResult(result);
      
      // Add to recent check-ins
      if (result.ticket) {
        const newCheckIn: RecentCheckIn = {
          ticketNumber: result.ticket.ticketNumber,
          buyerName: result.ticket.buyerName,
          tierName: result.ticket.tierName,
          timestamp: new Date(),
          success: result.success,
        };
        
        const updatedRecent = [newCheckIn, ...recentCheckIns].slice(0, 10); // Keep last 10
        setRecentCheckIns(updatedRecent);
        
        // Update localStorage
        try {
          const savedSession = localStorage.getItem('agentSession');
          if (savedSession) {
            const session = JSON.parse(savedSession);
            session.recentCheckIns = updatedRecent;
            if (result.success) {
              session.checkInCount = sessionCheckInCount + 1;
            }
            localStorage.setItem('agentSession', JSON.stringify(session));
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
      
      if (result.success) {
        setSessionCheckInCount((prev) => prev + 1);
        playSound(true);
      } else {
        playSound(false);
      }
      
      // Clear input for next scan
      setQrInput('');
      inputRef.current?.focus();
    } catch (err: any) {
      const errorResult = {
        success: false,
        message: err.message || 'Failed to check in ticket',
      };
      setLastResult(errorResult);
      playSound(false);
      
      // Check if code was deactivated
      if (err.message?.includes('deactivated')) {
        error('Your access code has been deactivated. Please contact the organizer.');
      }
    } finally {
      // Release lock
      scanLockRef.current = false;
      setScanning(false);
    }
  };

  // Handle Enter key for both forms
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  // Activation Screen
  if (!isActivated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <QrCode className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Agent Check-in Portal</CardTitle>
              <CardDescription className="mt-2">
                Enter your access code to start scanning tickets
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="accessCode" className="text-sm font-medium">Access Code</Label>
              <Input
                id="accessCode"
                placeholder="XXXXXXXXX"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setActivationError(null);
                }}
                onKeyDown={(e) => handleKeyDown(e, handleActivate)}
                maxLength={9}
                className={`text-center text-3xl font-mono tracking-[0.5em] uppercase h-16 ${
                  activationError ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
                autoComplete="off"
                autoFocus
              />
              {activationError ? (
                <p className="text-sm text-red-500 text-center flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4" />
                  {activationError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Get this code from your event organizer
                </p>
              )}
            </div>
            
            <Button
              className="w-full h-12 text-lg"
              onClick={handleActivate}
              disabled={activating || accessCode.length !== 9}
            >
              {activating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Activate & Start
                </>
              )}
            </Button>
            
            <div className="text-center">
              <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                ← Back to HDTicketDesk
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scanning Screen
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{agentLabel || 'Check-in Agent'}</p>
              <p className="text-xs text-muted-foreground">Agent Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              className="h-9 w-9"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Event Info - Compact */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {eventInfo?.coverImage ? (
                <img
                  src={eventInfo.coverImage}
                  alt={eventInfo.title}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-6 w-6 text-primary/60" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base truncate">{eventInfo?.title}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {eventInfo?.startDate && formatDate(eventInfo.startDate, 'short')}
                  </span>
                  {eventInfo?.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{eventInfo.location}</span>
                    </span>
                  )}
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0">
                <UserCheck className="h-3 w-3 mr-1" />
                {sessionCheckInCount}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Camera Scanner */}
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {/* Camera View - Always present in DOM for Html5Qrcode */}
            <div className="relative w-full aspect-square bg-black/5 overflow-hidden">
              <div id="agent-scanner" className="w-full h-full" />
              
              {/* Placeholder when camera is not active */}
              {!cameraActive && (
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

              {/* Processing overlay */}
              {cameraActive && scanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Processing...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Toggle Button */}
            <div className="p-4 border-t">
              <Button
                onClick={cameraActive ? stopCamera : startCamera}
                variant={cameraActive ? "destructive" : "default"}
                className="w-full h-12 text-base gap-2"
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="h-5 w-5" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    Start Scanner
                  </>
                )}
              </Button>
            </div>

            {/* Camera Error */}
            {cameraError && (
              <div className="p-4 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {cameraError}
                </p>
              </div>
            )}

            {/* Manual Input Section */}
            <div className="p-4 border-t space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span>or enter manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <div className="relative">
                <Input
                  ref={inputRef}
                  placeholder="Enter ticket number"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleScan)}
                  className="text-lg h-14 pr-12 font-mono"
                  autoComplete="off"
                />
                {qrInput && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => {
                      setQrInput('');
                      inputRef.current?.focus();
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                className="w-full h-14 text-lg"
                onClick={handleScan}
                disabled={scanning || !qrInput.trim()}
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Check In
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result - Large & Clear */}
        {lastResult && (
          <Card 
            className={`shadow-lg transition-all duration-300 ${
              lastResult.success 
                ? 'border-2 border-green-500 bg-green-50' 
                : 'border-2 border-red-500 bg-red-50'
            }`}
          >
            <CardContent className="pt-6 pb-4">
              <div className="text-center">
                {lastResult.success ? (
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <XCircle className="h-10 w-10 text-red-600" />
                  </div>
                )}
                <h3 className={`font-bold text-xl mb-1 ${lastResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {lastResult.success ? 'Check-in Successful!' : 'Check-in Failed'}
                </h3>
                <p className={`text-sm mb-4 ${lastResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {lastResult.message}
                </p>
                {lastResult.ticket && (
                  <div className="bg-white rounded-lg border p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-bold text-sm">{lastResult.ticket.ticketNumber}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium truncate">{lastResult.ticket.buyerName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tier:</span>
                        <p className="font-medium">{lastResult.ticket.tierName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Check-ins */}
        {recentCheckIns.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Check-ins
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentCheckIns.map((checkIn, index) => (
                  <div
                    key={`${checkIn.ticketNumber}-${index}`}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                      checkIn.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {checkIn.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-mono text-xs truncate">{checkIn.ticketNumber}</span>
                      <span className="text-muted-foreground truncate hidden sm:inline">
                        {checkIn.buyerName}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {checkIn.tierName}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips - Minimal */}
        <div className="text-center text-xs text-muted-foreground py-2">
          <p>💡 Use a barcode scanner for faster check-ins • Press Enter to submit</p>
        </div>
      </div>
    </div>
  );
}
