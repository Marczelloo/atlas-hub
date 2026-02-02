const GATEWAY_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001'
    : process.env.GATEWAY_INTERNAL_URL || 'http://gateway:3001';

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    ...options.headers,
  };

  // Only set Content-Type for requests with a body
  if (options.body) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  // Add dev admin token in development (available in browser via NEXT_PUBLIC_)
  const devToken = process.env.NEXT_PUBLIC_DEV_ADMIN_TOKEN;
  if (devToken) {
    (headers as Record<string, string>)['x-dev-admin-token'] = devToken;
  }

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies for auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  projectId: string;
  keyType: 'publishable' | 'secret';
  keyPrefix: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

// Stats interfaces
export interface StatsOverview {
  totalProjects: number;
  totalUsers: number;
  totalFiles: number;
  totalStorageBytes: number;
  activeApiKeys: number;
  adminUsers: number;
  regularUsers: number;
}

export interface ProjectStats {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  storageBytes: number;
  fileCount: number;
  apiKeyCount: number;
  bucketCount: number;
}

export interface TimelineData {
  date: string;
  projects: number;
  users: number;
  files: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  projectId: string | null;
  projectName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateProjectResponse {
  project: Project;
  publishableKey: string;
  secretKey: string;
}

export const api = {
  // Projects
  async listProjects(): Promise<{ data: Project[] }> {
    return fetchApi('/admin/projects');
  },

  async getProject(id: string): Promise<{ data: Project }> {
    return fetchApi(`/admin/projects/${id}`);
  },

  async createProject(data: {
    name: string;
    description?: string;
  }): Promise<{ data: CreateProjectResponse }> {
    return fetchApi('/admin/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<void> {
    await fetchApi(`/admin/projects/${id}`, { method: 'DELETE' });
  },

  // API Keys
  async listProjectKeys(projectId: string): Promise<{ data: ApiKey[] }> {
    return fetchApi(`/admin/projects/${projectId}/keys`);
  },

  async rotateKey(
    projectId: string,
    keyType: 'publishable' | 'secret'
  ): Promise<{ data: { apiKey: ApiKey; newKey: string } }> {
    return fetchApi(`/admin/projects/${projectId}/keys/rotate`, {
      method: 'POST',
      body: JSON.stringify({ keyType }),
    });
  },

  async revokeKey(projectId: string, keyId: string): Promise<void> {
    await fetchApi(`/admin/projects/${projectId}/keys/${keyId}`, { method: 'DELETE' });
  },

  // SQL Editor
  async executeSQL(
    projectId: string,
    sql: string
  ): Promise<{
    data: {
      columns: string[];
      rows: Record<string, unknown>[];
      rowCount: number;
      executionTimeMs: number;
    };
  }> {
    return fetchApi(`/admin/projects/${projectId}/sql`, {
      method: 'POST',
      body: JSON.stringify({ sql }),
    });
  },

  // Tables
  async listTables(projectId: string): Promise<{
    data: Array<{ name: string; type: 'table' | 'view' }>;
  }> {
    return fetchApi(`/admin/projects/${projectId}/tables`);
  },

  async getTableColumns(
    projectId: string,
    tableName: string
  ): Promise<{
    data: Array<{ name: string; type: string; nullable: boolean; default: string | null }>;
  }> {
    return fetchApi(`/admin/projects/${projectId}/tables/${tableName}/columns`);
  },

  // Storage
  async listBuckets(projectId: string): Promise<{
    data: Array<{ id: string; name: string; createdAt: string }>;
  }> {
    return fetchApi(`/admin/projects/${projectId}/buckets`);
  },

  async listFiles(
    projectId: string,
    bucketName: string,
    prefix?: string
  ): Promise<{
    data: Array<{ key: string; size: number; lastModified: string }>;
  }> {
    const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
    return fetchApi(`/admin/projects/${projectId}/buckets/${bucketName}/files${params}`);
  },

  async getSignedUploadUrl(
    projectId: string,
    bucket: string,
    path: string,
    contentType: string,
    maxSize?: number
  ): Promise<{ objectKey: string; uploadUrl: string; expiresIn: number }> {
    return fetchApi(`/admin/projects/${projectId}/signed-upload`, {
      method: 'POST',
      body: JSON.stringify({ bucket, path, contentType, maxSize }),
    });
  },

  async deleteFile(
    projectId: string,
    bucketName: string,
    objectKey: string
  ): Promise<{ success: boolean }> {
    return fetchApi(
      `/admin/projects/${projectId}/buckets/${bucketName}/files?objectKey=${encodeURIComponent(objectKey)}`,
      { method: 'DELETE' }
    );
  },

  async getSignedDownloadUrl(
    projectId: string,
    bucketName: string,
    objectKey: string
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    return fetchApi(
      `/admin/projects/${projectId}/buckets/${bucketName}/signed-download?objectKey=${encodeURIComponent(objectKey)}`
    );
  },

  // Stats
  async getStatsOverview(): Promise<StatsOverview> {
    return fetchApi('/admin/stats/overview');
  },

  async getProjectsStats(): Promise<{ projects: ProjectStats[] }> {
    return fetchApi('/admin/stats/projects');
  },

  async getTimeline(days?: number): Promise<{ timeline: TimelineData[] }> {
    const params = days ? `?days=${days}` : '';
    return fetchApi(`/admin/stats/timeline${params}`);
  },

  async getActivity(limit?: number): Promise<{ activity: ActivityItem[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return fetchApi(`/admin/activity${params}`);
  },

  // Settings
  async getSettings(): Promise<PlatformSettings> {
    return fetchApi('/admin/settings');
  },

  async updateRateLimits(rateLimitMax: number, rateLimitWindowMs: number): Promise<{
    message: string;
    rateLimitMax: number;
    rateLimitWindowMs: number;
  }> {
    return fetchApi('/admin/settings/rate-limits', {
      method: 'PUT',
      body: JSON.stringify({ rateLimitMax, rateLimitWindowMs }),
    });
  },

  async updateDatabaseLimits(sqlMaxRows: number, sqlStatementTimeoutMs: number): Promise<{
    message: string;
    sqlMaxRows: number;
    sqlStatementTimeoutMs: number;
  }> {
    return fetchApi('/admin/settings/database-limits', {
      method: 'PUT',
      body: JSON.stringify({ sqlMaxRows, sqlStatementTimeoutMs }),
    });
  },

  async updateStorageSettings(minioPublicUrl: string): Promise<{
    message: string;
    minioPublicUrl: string;
  }> {
    return fetchApi('/admin/settings/storage', {
      method: 'PUT',
      body: JSON.stringify({ minioPublicUrl }),
    });
  },
};

// Platform Settings interface
export interface PlatformSettings {
  version: string;
  nodeEnv: string;
  port: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  sqlMaxRows: number;
  sqlStatementTimeoutMs: number;
  minioEndpoint: string;
  minioPublicUrl: string;
  totalProjects: number;
  totalUsers: number;
  totalApiKeys: number;
}
