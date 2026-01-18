import { Suspense } from 'react';
import OrganizerSetupClient from './organizer-setup-client';

export default function OrganizerSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <OrganizerSetupClient />
    </Suspense>
  );
}
