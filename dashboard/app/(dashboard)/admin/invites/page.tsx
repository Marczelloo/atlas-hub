'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Copy, Check, Trash2, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

interface InviteKey {
  id: string;
  keyPrefix: string;
  createdBy: string;
  usedBy: string | null;
  maxUses: number;
  useCount: number;
  createdAt: string;
  expiresAt: string | null;
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<InviteKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/admin/invites`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.data);
      }
    } catch {
      setError('Failed to fetch invite keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleCreate = async () => {
    setIsCreating(true);
    setNewKey(null);
    setError(null);

    try {
      const res = await fetch(`${GATEWAY_URL}/admin/invites`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.data.key);
        fetchInvites();
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to create invite' }));
        setError(err.message);
      }
    } catch {
      setError('Failed to create invite key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${GATEWAY_URL}/admin/invites/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setInvites(invites.filter((inv) => inv.id !== id));
      }
    } catch {
      setError('Failed to delete invite key');
    }
  };

  const copyToClipboard = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Invite Keys</h1>
            <p className="text-zinc-400 mt-1">Generate invite keys for new users to register</p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Key
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {newKey && (
          <Card className="mb-6 bg-emerald-500/10 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-emerald-400 text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                New Invite Key Created
              </CardTitle>
              <CardDescription className="text-emerald-300/70">
                Copy this key now. It won&apos;t be shown again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 rounded-md bg-zinc-900 text-emerald-300 font-mono text-sm border border-zinc-800">
                  {newKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="border-emerald-500/20 hover:bg-emerald-500/10"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">All Invite Keys</CardTitle>
            <CardDescription className="text-zinc-400">
              {invites.length} invite key{invites.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No invite keys yet. Generate one to invite users.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Key Prefix</TableHead>
                    <TableHead className="text-zinc-400">Created</TableHead>
                    <TableHead className="text-zinc-400">Expires</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400 w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id} className="border-zinc-800">
                      <TableCell className="font-mono text-zinc-300">
                        {invite.keyPrefix}...
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {formatDate(invite.createdAt)}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {formatDate(invite.expiresAt)}
                      </TableCell>
                      <TableCell>
                        {invite.useCount >= invite.maxUses ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400">
                            Used ({invite.useCount}/{invite.maxUses})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                            Available ({invite.useCount}/{invite.maxUses})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {invite.useCount < invite.maxUses && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(invite.id)}
                            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
