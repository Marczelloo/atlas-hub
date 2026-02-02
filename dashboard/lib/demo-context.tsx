'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

interface DemoContextValue {
  isDemo: boolean;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false, exitDemo: () => {} });

export function DemoProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  
  // Compute isDemo synchronously from searchParams to avoid flicker
  const isDemo = useMemo(() => {
    const demoParam = searchParams.get('demo');
    return demoParam === 'true' || demoParam === '1';
  }, [searchParams]);

  // Use window.location for exit to avoid router state issues
  const exitDemo = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/landing';
    }
  };

  return (
    <DemoContext.Provider value={{ isDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  return useContext(DemoContext);
}
