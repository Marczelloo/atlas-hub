import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure platform settings, rate limits, and security',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
