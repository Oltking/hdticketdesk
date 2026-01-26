'use client';

import { Suspense } from 'react';
import RoleSelectionClient from './role-selection-client';

export default function RoleSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <RoleSelectionClient />
    </Suspense>
  );
}
