import type { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'Projects | AtlasHub',
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
