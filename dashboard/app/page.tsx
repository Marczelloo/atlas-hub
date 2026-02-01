import Link from 'next/link';
import { Database, HardDrive, Settings } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">AtlasHub</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Welcome to AtlasHub</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Your self-hosted backend platform. Manage projects, databases, and storage from one
            place.
          </p>

          <div className="grid gap-4">
            <Link
              href="/projects"
              className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-md bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium group-hover:text-primary transition-colors">Projects</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage your project databases
                </p>
              </div>
            </Link>

            <Link
              href="/storage"
              className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-md bg-primary/10">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium group-hover:text-primary transition-colors">Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Browse and manage file storage buckets
                </p>
              </div>
            </Link>

            <Link
              href="/settings"
              className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-md bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium group-hover:text-primary transition-colors">Settings</h3>
                <p className="text-sm text-muted-foreground">Configure platform settings</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
