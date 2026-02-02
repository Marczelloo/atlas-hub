'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Database, Users, Key, FileText, BookOpen } from 'lucide-react';
import { type StatsOverview, type ProjectStats, type TimelineData, type ActivityItem } from '@/lib/api';
import { useDemoApi } from '@/lib/demo-api';
import { useDemo } from '@/lib/demo-context';
import { StatCard, ActivityFeed, StorageChart, TimelineChart } from '@/components/stats';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function HomePage() {
  const api = useDemoApi();
  const { isDemo } = useDemo();
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [projects, setProjects] = useState<ProjectStats[]>([]);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const [overviewRes, projectsRes, timelineRes, activityRes] = await Promise.all([
          api.getStatsOverview(),
          api.getProjectsStats(),
          api.getTimeline(30),
          api.getActivity(15),
        ]);
        setOverview(overviewRes);
        setProjects(projectsRes.projects);
        setTimeline(timelineRes.timeline);
        setActivity(activityRes.activity);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [api]);

  // Build links with demo param if in demo mode
  const buildLink = (path: string) => isDemo ? `${path}?demo=true` : path;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-zinc-800" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-zinc-800 bg-zinc-900" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-xl border border-zinc-800 bg-zinc-900" />
            <div className="h-80 rounded-xl border border-zinc-800 bg-zinc-900" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
          Dashboard Overview
        </h2>
        <p className="text-zinc-400">
          Monitor your platform statistics and recent activity
        </p>
      </div>

      {/* Quick Links Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href={buildLink('/projects')}
          className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800 hover:border-emerald-500/30"
        >
          <div className="rounded-md bg-emerald-500/10 p-2.5">
            <Database className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-100 group-hover:text-emerald-400">
              Projects
            </p>
            <p className="text-sm text-zinc-400 truncate">Manage databases</p>
          </div>
        </Link>
        <Link
          href={buildLink('/docs')}
          className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800 hover:border-emerald-500/30"
        >
          <div className="rounded-md bg-emerald-500/10 p-2.5">
            <BookOpen className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-100 group-hover:text-emerald-400">
              Documentation
            </p>
            <p className="text-sm text-zinc-400 truncate">API reference & guides</p>
          </div>
        </Link>
        <Link
          href={buildLink('/admin/users')}
          className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800 hover:border-emerald-500/30"
        >
          <div className="rounded-md bg-emerald-500/10 p-2.5">
            <Users className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-100 group-hover:text-emerald-400">
              Users
            </p>
            <p className="text-sm text-zinc-400 truncate">Manage user accounts</p>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={overview?.totalProjects ?? 0}
          icon={Database}
        />
        <StatCard
          title="Total Users"
          value={overview?.totalUsers ?? 0}
          description={`${overview?.adminUsers ?? 0} admins, ${overview?.regularUsers ?? 0} regular`}
          icon={Users}
        />
        <StatCard
          title="Total Files"
          value={overview?.totalFiles ?? 0}
          description={formatBytes(overview?.totalStorageBytes ?? 0)}
          icon={FileText}
        />
        <StatCard
          title="Active API Keys"
          value={overview?.activeApiKeys ?? 0}
          icon={Key}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TimelineChart data={timeline} />
        <StorageChart projects={projects} />
      </div>

      {/* Activity Feed */}
      <ActivityFeed items={activity} maxHeight="400px" />
    </div>
  );
}
