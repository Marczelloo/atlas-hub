'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ProjectStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Database, HardDrive, Key, FolderOpen, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const res = await api.getProjectsStats();
        setProjects(res.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const totalStorage = projects.reduce((sum, p) => sum + p.storageBytes, 0);
  const totalFiles = projects.reduce((sum, p) => sum + p.fileCount, 0);
  const totalApiKeys = projects.reduce((sum, p) => sum + p.apiKeyCount, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-zinc-800" />
          <div className="grid gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-900" />
            ))}
          </div>
          <div className="h-96 rounded-xl border border-zinc-800 bg-zinc-900" />
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
          All Projects Overview
        </h2>
        <p className="text-zinc-400">
          Platform-wide project statistics and resource usage
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Database className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatBytes(totalStorage)}</p>
                <p className="text-sm text-muted-foreground">Total Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFiles}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Key className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalApiKeys}</p>
                <p className="text-sm text-muted-foreground">Active API Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Database className="mb-4 h-12 w-12" />
              <p>No projects found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>API Keys</TableHead>
                    <TableHead>Buckets</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {project.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {formatBytes(project.storageBytes)}
                        </span>
                      </TableCell>
                      <TableCell>{project.fileCount}</TableCell>
                      <TableCell>{project.apiKeyCount}</TableCell>
                      <TableCell>{project.bucketCount}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(project.createdAt), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/projects/${project.slug}`}
                          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="View project"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
