import { Suspense } from 'react';
import VerifyEmailClient from './verify-email-client';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
