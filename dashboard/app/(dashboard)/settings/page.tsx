'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Database,
  Server,
  HardDrive,
  Gauge,
  RefreshCw,
  User,
  Key,
  Lock,
  LogOut,
  Save,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, type PlatformSettings } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo-context';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isDemo } = useDemo();
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable rate limit fields
  const [rateLimitMax, setRateLimitMax] = useState<number>(100);
  const [rateLimitWindowSeconds, setRateLimitWindowSeconds] = useState<number>(60);
  const [savingRateLimits, setSavingRateLimits] = useState(false);

  // Editable database limit fields
  const [sqlMaxRows, setSqlMaxRows] = useState<number>(1000);
  const [sqlStatementTimeoutSeconds, setSqlStatementTimeoutSeconds] = useState<number>(5);
  const [savingDbLimits, setSavingDbLimits] = useState(false);

  // Editable storage fields
  const [minioPublicUrl, setMinioPublicUrl] = useState<string>('http://localhost:9100');
  const [savingStorage, setSavingStorage] = useState(false);

  useEffect(() => {
    if (isDemo) {
      // Mock settings for demo mode
      const mockSettings = {
        version: '0.1.0',
        nodeEnv: 'development',
        port: 3001,
        rateLimitMax: 100,
        rateLimitWindowMs: 60000,
        sqlMaxRows: 1000,
        sqlStatementTimeoutMs: 5000,
        minioEndpoint: 'localhost:9100',
        minioPublicUrl: 'http://localhost:9100',
        totalProjects: 3,
        totalUsers: 2,
        totalApiKeys: 6,
      };
      setSettings(mockSettings);
      setRateLimitMax(mockSettings.rateLimitMax);
      setRateLimitWindowSeconds(mockSettings.rateLimitWindowMs / 1000);
      setSqlMaxRows(mockSettings.sqlMaxRows);
      setSqlStatementTimeoutSeconds(mockSettings.sqlStatementTimeoutMs / 1000);
      setMinioPublicUrl(mockSettings.minioPublicUrl);
      setLoading(false);
      return;
    }

    loadSettings();
  }, [isDemo]);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setRateLimitMax(data.rateLimitMax);
      setRateLimitWindowSeconds(data.rateLimitWindowMs / 1000);
      setSqlMaxRows(data.sqlMaxRows);
      setSqlStatementTimeoutSeconds(data.sqlStatementTimeoutMs / 1000);
      setMinioPublicUrl(data.minioPublicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRateLimits() {
    if (isDemo) {
      setError('Cannot modify settings in demo mode');
      return;
    }

    try {
      setSavingRateLimits(true);
      setError(null);
      setSuccess(null);

      const result = await api.updateRateLimits(rateLimitMax, rateLimitWindowSeconds * 1000);
      
      // Update local state with new values
      if (settings) {
        setSettings({
          ...settings,
          rateLimitMax: result.rateLimitMax,
          rateLimitWindowMs: result.rateLimitWindowMs,
        });
      }
      
      setSuccess('Rate limits updated successfully! Changes take effect immediately.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate limits');
    } finally {
      setSavingRateLimits(false);
    }
  }

  async function handleSaveDbLimits() {
    if (isDemo) {
      setError('Cannot modify settings in demo mode');
      return;
    }

    try {
      setSavingDbLimits(true);
      setError(null);
      setSuccess(null);

      const result = await api.updateDatabaseLimits(sqlMaxRows, sqlStatementTimeoutSeconds * 1000);
      
      // Update local state with new values
      if (settings) {
        setSettings({
          ...settings,
          sqlMaxRows: result.sqlMaxRows,
          sqlStatementTimeoutMs: result.sqlStatementTimeoutMs,
        });
      }
      
      setSuccess('Database limits updated successfully! Changes take effect immediately.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update database limits');
    } finally {
      setSavingDbLimits(false);
    }
  }

  async function handleSaveStorageSettings() {
    if (isDemo) {
      setError('Cannot modify settings in demo mode');
      return;
    }

    try {
      setSavingStorage(true);
      setError(null);
      setSuccess(null);

      const result = await api.updateStorageSettings(minioPublicUrl);
      
      // Update local state with new values
      if (settings) {
        setSettings({
          ...settings,
          minioPublicUrl: result.minioPublicUrl,
        });
      }
      
      setSuccess('Storage settings updated successfully! Changes take effect immediately.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update storage settings');
    } finally {
      setSavingStorage(false);
    }
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="space-y-4 max-w-2xl">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure platform settings and view system info</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-500 rounded-lg">{success}</div>
      )}

      <div className="space-y-6 max-w-3xl">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Email</span>
                <p className="font-mono text-sm px-3 py-2 rounded-md bg-muted/50 border border-border">
                  {user?.email || 'demo@example.com'}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Role</span>
                <p className="font-mono text-sm px-3 py-2 rounded-md bg-muted/50 border border-border capitalize">
                  {user?.role || 'admin'}
                </p>
              </div>
            </div>
            {!isDemo && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Platform Info</CardTitle>
                  <CardDescription>Current server configuration</CardDescription>
                </div>
              </div>
              {!isDemo && (
                <Button variant="ghost" size="icon" onClick={loadSettings} className="h-8 w-8">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground text-xs">Version</span>
                <p className="font-medium font-mono">{settings?.version || '0.1.0'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground text-xs">Environment</span>
                <p className="font-medium capitalize">{settings?.nodeEnv || 'development'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground text-xs">Gateway Port</span>
                <p className="font-medium font-mono">{settings?.port || 3001}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-400">Projects</span>
                <p className="font-semibold text-lg text-emerald-500">
                  {settings?.totalProjects || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs text-blue-400">Users</span>
                <p className="font-semibold text-lg text-blue-500">{settings?.totalUsers || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span className="text-xs text-purple-400">API Keys</span>
                <p className="font-semibold text-lg text-purple-500">
                  {settings?.totalApiKeys || 0}
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
                <CardDescription>Authentication and access settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Session Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    JWT-based sessions with HTTP-only cookies
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Invite-Only Registration</p>
                  <p className="text-xs text-muted-foreground">
                    New users require a valid invite key
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full">
                Enabled
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Admin users can create invite keys from the Invites page. API keys use SHA-256 hashing
              with constant-time comparison.
            </p>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Rate Limiting</CardTitle>
                <CardDescription>API request throttling configuration (live editable)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rateLimitMax" className="text-xs text-muted-foreground">
                  Max Requests per Window
                </Label>
                <Input
                  id="rateLimitMax"
                  type="number"
                  min={1}
                  max={10000}
                  value={rateLimitMax}
                  onChange={(e) => setRateLimitMax(parseInt(e.target.value) || 1)}
                  disabled={isDemo}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rateLimitWindow" className="text-xs text-muted-foreground">
                  Time Window (seconds)
                </Label>
                <Input
                  id="rateLimitWindow"
                  type="number"
                  min={1}
                  max={3600}
                  value={rateLimitWindowSeconds}
                  onChange={(e) => setRateLimitWindowSeconds(parseInt(e.target.value) || 1)}
                  disabled={isDemo}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">{rateLimitMax}</span> requests per{' '}
                <span className="font-medium">{rateLimitWindowSeconds}</span>{' '}
                seconds per IP address
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Changes take effect immediately without restart.
              </p>
              <Button
                size="sm"
                onClick={handleSaveRateLimits}
                disabled={isDemo || savingRateLimits}
              >
                {savingRateLimits ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Database Limits</CardTitle>
                <CardDescription>SQL query execution limits (live editable)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sqlMaxRows" className="text-xs text-muted-foreground">
                  Max Rows per Query
                </Label>
                <Input
                  id="sqlMaxRows"
                  type="number"
                  min={1}
                  max={100000}
                  value={sqlMaxRows}
                  onChange={(e) => setSqlMaxRows(parseInt(e.target.value) || 1)}
                  disabled={isDemo}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sqlStatementTimeout" className="text-xs text-muted-foreground">
                  Statement Timeout (seconds)
                </Label>
                <Input
                  id="sqlStatementTimeout"
                  type="number"
                  min={0.1}
                  max={300}
                  step={0.1}
                  value={sqlStatementTimeoutSeconds}
                  onChange={(e) => setSqlStatementTimeoutSeconds(parseFloat(e.target.value) || 0.1)}
                  disabled={isDemo}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                Queries return max <span className="font-medium">{sqlMaxRows}</span> rows with{' '}
                <span className="font-medium">{sqlStatementTimeoutSeconds}s</span> timeout
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Changes take effect immediately without restart.
              </p>
              <Button
                size="sm"
                onClick={handleSaveDbLimits}
                disabled={isDemo || savingDbLimits}
              >
                {savingDbLimits ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Storage Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Storage</CardTitle>
                <CardDescription>MinIO S3-compatible storage configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Internal Endpoint (read-only)</span>
              <p className="font-mono text-sm px-3 py-2 rounded-md bg-muted/50 border border-border">
                {settings?.minioEndpoint || 'localhost:9100'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minioPublicUrl" className="text-xs text-muted-foreground">
                Public URL
              </Label>
              <Input
                id="minioPublicUrl"
                type="url"
                value={minioPublicUrl}
                onChange={(e) => setMinioPublicUrl(e.target.value)}
                disabled={isDemo}
                placeholder="https://storage.example.com"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Public URL is used for presigned download URLs.
              </p>
              <Button
                size="sm"
                onClick={handleSaveStorageSettings}
                disabled={isDemo || savingStorage}
              >
                {savingStorage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
