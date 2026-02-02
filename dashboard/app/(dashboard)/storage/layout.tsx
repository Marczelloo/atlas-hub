import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Storage',
  description: 'Browse and manage files in S3-compatible storage buckets',
};

export default function StorageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
