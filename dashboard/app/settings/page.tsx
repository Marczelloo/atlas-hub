'use client';

import { Shield, Database, Bell, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const settings = {
    maxRowsPerQuery: '1000',
    statementTimeoutMs: '5000',
    rateLimitMax: '100',
    rateLimitWindowMs: '60000',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure platform settings and preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Platform Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Platform Info</CardTitle>
                <CardDescription>Current platform configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Version</span>
                <p className="font-medium">0.1.0</p>
              </div>
              <div>
                <span className="text-muted-foreground">Environment</span>
                <p className="font-medium">{process.env.NODE_ENV || 'development'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Gateway URL</span>
                <p className="font-medium font-mono text-xs">
                  {process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription>Authentication and access control</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Cloudflare Access</p>
                <p className="text-xs text-muted-foreground">JWT verification for admin routes</p>
              </div>
              <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-600 rounded-full">
                Dev Mode
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              In development mode, admin routes accept the dev token. Configure Cloudflare Access
              for production use.
            </p>
          </CardContent>
        </Card>

        {/* Database Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Database Limits</CardTitle>
                <CardDescription>Query execution limits (read-only display)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max Rows per Query</Label>
                <Input
                  value={settings.maxRowsPerQuery}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Statement Timeout (ms)</Label>
                <Input
                  value={settings.statementTimeoutMs}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              These values are configured via environment variables. Restart the gateway to apply
              changes.
            </p>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Rate Limiting</CardTitle>
                <CardDescription>API rate limit configuration (read-only display)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max Requests</Label>
                <Input
                  value={settings.rateLimitMax}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Window (ms)</Label>
                <Input
                  value={settings.rateLimitWindowMs}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Rate limits apply per IP address. Configure via RATE_LIMIT_MAX and
              RATE_LIMIT_WINDOW_MS.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
