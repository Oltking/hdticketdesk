import { Suspense } from 'react';
import VerifyWithdrawalClient from './verify-client';

export default function VerifyWithdrawalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <div className="text-sm text-muted-foreground">Loading verification…</div>
        </div>
      }
    >
      <VerifyWithdrawalClient />
    </Suspense>
  );
}
