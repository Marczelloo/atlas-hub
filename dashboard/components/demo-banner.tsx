'use client';

import { useDemo } from '@/lib/demo-context';
import { Eye, X } from 'lucide-react';
import { useState } from 'react';

export function DemoBanner() {
  const { isDemo, exitDemo } = useDemo();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white">
      <div className="mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">
            Demo Mode — You&apos;re viewing with sample data. 
            <button
              onClick={exitDemo}
              className="ml-2 underline underline-offset-2 hover:no-underline"
            >
              Exit demo
            </button>
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 transition-colors hover:bg-white/20"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
