'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { Loader2, CheckCircle2, XCircle, Ticket } from 'lucide-react';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');

      if (!reference) {
        setStatus('error');
        setMessage('Payment reference not found. Please contact support if you were charged.');
        return;
      }

      try {
        const response = await api.verifyPayment(reference);
        setStatus('success');
        setMessage(response.message || 'Payment successful! Your ticket has been issued.');
        setTicket(response.ticket);

        // Redirect to tickets page after 3 seconds
        setTimeout(() => {
          router.push('/tickets');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Payment verification failed. Please contact support if you were charged.');
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-purple-500/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Verifying Payment
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Payment Successful
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="w-6 h-6 text-red-500" />
                Payment Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center text-muted-foreground">
              <p>Please wait while we verify your payment...</p>
              <p className="text-sm mt-2">This should only take a moment.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <Ticket className="w-12 h-12 mx-auto mb-2 text-green-600" />
                <p className="text-green-700 dark:text-green-300">{message}</p>
              </div>

              {ticket && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Ticket Number: <span className="font-mono font-semibold">{ticket.ticketNumber}</span></p>
                  {ticket.event?.title && (
                    <p>Event: <span className="font-semibold">{ticket.event.title}</span></p>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Redirecting to your tickets...
              </p>

              <Button onClick={() => router.push('/tickets')} className="w-full">
                View My Tickets
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-red-700 dark:text-red-300">{message}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/events')}
                  className="flex-1"
                >
                  Browse Events
                </Button>
                <Button
                  onClick={() => router.push('/tickets')}
                  className="flex-1"
                >
                  My Tickets
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-purple-500/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                Loading...
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              <p>Please wait...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
