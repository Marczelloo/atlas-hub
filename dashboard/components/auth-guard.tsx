'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useDemo } from '@/lib/demo-context';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const { isDemo } = useDemo();

  useEffect(() => {
    // Skip auth checks in demo mode
    if (isDemo) return;

    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (requireAdmin && !isAdmin) {
        // User is authenticated but not admin - redirect to home or show error
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, requireAdmin, router, isDemo]);

  // In demo mode, always render children
  if (isDemo) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 mb-2">Access Denied</h1>
          <p className="text-zinc-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
