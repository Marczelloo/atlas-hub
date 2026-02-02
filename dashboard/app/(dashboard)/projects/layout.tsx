import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Manage your database projects and API keys',
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
