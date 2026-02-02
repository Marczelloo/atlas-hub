'use client';

import { Suspense } from 'react';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { DemoProvider } from '@/lib/demo-context';
import { DemoBanner } from '@/components/demo-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DemoProvider>
        <AuthGuard>
          <div className="flex h-screen flex-col bg-zinc-950 overflow-hidden">
            <DemoBanner />
            <div className="flex flex-1 min-h-0">
              <Sidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
        </AuthGuard>
      </DemoProvider>
    </Suspense>
  );
}
