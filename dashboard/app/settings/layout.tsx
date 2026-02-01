import type { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'Settings | AtlasHub',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
