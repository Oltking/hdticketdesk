import { Suspense } from 'react';
import SignupClient from './signup-client';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
