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
};
