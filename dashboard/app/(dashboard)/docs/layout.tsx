import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'API documentation, quickstart guides, and usage examples',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
