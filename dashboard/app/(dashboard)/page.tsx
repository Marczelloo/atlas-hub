'use client';

import Link from 'next/link';
import { Database, HardDrive, Settings } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight mb-4 text-zinc-100">
          Welcome to AtlasHub
        </h2>
        <p className="text-zinc-400 text-lg mb-8">
          Your self-hosted backend platform. Manage projects, databases, and storage from one place.
        </p>

        <div className="grid gap-4">
          <Link
            href="/projects"
            className="group flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="p-2 rounded-md bg-emerald-500/10">
              <Database className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Projects
              </h3>
              <p className="text-sm text-zinc-400">Create and manage your project databases</p>
            </div>
          </Link>

          <Link
            href="/storage"
            className="group flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="p-2 rounded-md bg-emerald-500/10">
              <HardDrive className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Storage
              </h3>
              <p className="text-sm text-zinc-400">Browse and manage file storage buckets</p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="group flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="p-2 rounded-md bg-emerald-500/10">
              <Settings className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Settings
              </h3>
              <p className="text-sm text-zinc-400">Configure platform settings</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
