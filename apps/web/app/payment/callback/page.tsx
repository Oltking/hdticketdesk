import { Suspense } from 'react';
import PaymentCallbackClient from './callback-client';

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-purple-500/5 p-4">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <PaymentCallbackClient />
    </Suspense>
  );
}
