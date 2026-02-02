'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Database, Calendar, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Project } from '@/lib/api';
import { useDemoApi } from '@/lib/demo-api';
import { useDemo } from '@/lib/demo-context';

export default function ProjectsPage() {
  const api = useDemoApi();
  const { isDemo } = useDemo();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [createdKeys, setCreatedKeys] = useState<{
    publishableKey: string;
    secretKey: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'publishable' | 'secret' | null>(null);

  function copyToClipboard(text: string, keyType: 'publishable' | 'secret') {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyType);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  useEffect(() => {
    loadProjects();
  }, [api]);

  async function loadProjects() {
    try {
      setIsLoading(true);
      const response = await api.listProjects();
      setProjects(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateProject() {
    try {
      const response = await api.createProject(newProject);
      setCreatedKeys({
        publishableKey: response.data.publishableKey,
        secretKey: response.data.secretKey,
      });
      setProjects((prev) => [response.data.project, ...prev]);
      setNewProject({ name: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your project databases and API keys</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            {createdKeys ? (
              <>
                <DialogHeader>
                  <DialogTitle>Project Created!</DialogTitle>
                  <DialogDescription>
                    Save these API keys now. The secret key will not be shown again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-muted-foreground">Publishable Key</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(createdKeys.publishableKey, 'publishable')}
                      >
                        {copiedKey === 'publishable' ? (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <code className="block p-2 bg-muted rounded text-xs font-mono break-all">
                      {createdKeys.publishableKey}
                    </code>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-muted-foreground">Secret Key</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(createdKeys.secretKey, 'secret')}
                      >
                        {copiedKey === 'secret' ? (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <code className="block p-2 bg-muted rounded text-xs font-mono break-all text-destructive">
                      {createdKeys.secretKey}
                    </code>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setCreatedKeys(null);
                      setIsCreateOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project with its own database and API keys.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={newProject.name}
                      onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
                      placeholder="My App"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      value={newProject.description}
                      onChange={(e) =>
                        setNewProject((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="A brief description of the project"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProject.name.trim()}>
                    Create Project
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
      )}

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first project to get started
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group relative">
              <Link href={isDemo ? `/projects/${project.id}?demo=true` : `/projects/${project.id}`} className="absolute inset-0" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteProject(project.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <CardDescription className="mb-3 line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(project.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
