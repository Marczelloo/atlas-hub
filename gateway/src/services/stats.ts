import { platformDb } from '../db/platform.js';

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
  createdAt: Date;
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
  createdAt: Date;
}

export const statsService = {
  async getOverview(): Promise<StatsOverview> {
    // Get project count
    const projectsResult = await platformDb.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM projects'
    );
    const totalProjects = parseInt(projectsResult.rows[0]?.count || '0', 10);

    // Get user counts
    const usersResult = await platformDb.query<{ role: string; count: string }>(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );
    let totalUsers = 0;
    let adminUsers = 0;
    let regularUsers = 0;
    for (const row of usersResult.rows) {
      const count = parseInt(row.count, 10);
      totalUsers += count;
      if (row.role === 'admin') adminUsers = count;
      else regularUsers += count;
    }

    // Get file count and storage
    const filesResult = await platformDb.query<{ count: string; total_size: string }>(
      'SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM file_metadata'
    );
    const totalFiles = parseInt(filesResult.rows[0]?.count || '0', 10);
    const totalStorageBytes = parseInt(filesResult.rows[0]?.total_size || '0', 10);

    // Get active API keys count
    const keysResult = await platformDb.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM api_keys WHERE revoked_at IS NULL'
    );
    const activeApiKeys = parseInt(keysResult.rows[0]?.count || '0', 10);

    return {
      totalProjects,
      totalUsers,
      totalFiles,
      totalStorageBytes,
      activeApiKeys,
      adminUsers,
      regularUsers,
    };
  },

  async getProjectsStats(): Promise<ProjectStats[]> {
    const result = await platformDb.query<{
      id: string;
      name: string;
      slug: string;
      created_at: Date;
      storage_bytes: string;
      file_count: string;
      api_key_count: string;
      bucket_count: string;
    }>(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.created_at,
        COALESCE(fm.storage_bytes, 0) as storage_bytes,
        COALESCE(fm.file_count, 0) as file_count,
        COALESCE(ak.api_key_count, 0) as api_key_count,
        COALESCE(b.bucket_count, 0) as bucket_count
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(size) as storage_bytes, COUNT(*) as file_count
        FROM file_metadata
        GROUP BY project_id
      ) fm ON fm.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as api_key_count
        FROM api_keys
        WHERE revoked_at IS NULL
        GROUP BY project_id
      ) ak ON ak.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as bucket_count
        FROM buckets
        GROUP BY project_id
      ) b ON b.project_id = p.id
      ORDER BY p.created_at DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
      storageBytes: parseInt(row.storage_bytes, 10),
      fileCount: parseInt(row.file_count, 10),
      apiKeyCount: parseInt(row.api_key_count, 10),
      bucketCount: parseInt(row.bucket_count, 10),
    }));
  },

  async getTimeline(days: number = 30): Promise<TimelineData[]> {
    const result = await platformDb.query<{
      date: Date;
      projects: string;
      users: string;
      files: string;
    }>(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days - 1} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ),
      project_counts AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM projects
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ),
      user_counts AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ),
      file_counts AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM file_metadata
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      )
      SELECT 
        ds.date,
        COALESCE(pc.count, 0) as projects,
        COALESCE(uc.count, 0) as users,
        COALESCE(fc.count, 0) as files
      FROM date_series ds
      LEFT JOIN project_counts pc ON pc.date = ds.date
      LEFT JOIN user_counts uc ON uc.date = ds.date
      LEFT JOIN file_counts fc ON fc.date = ds.date
      ORDER BY ds.date ASC
    `);

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      projects: parseInt(row.projects, 10),
      users: parseInt(row.users, 10),
      files: parseInt(row.files, 10),
    }));
  },

  async getActivity(limit: number = 20): Promise<ActivityItem[]> {
    const result = await platformDb.query<{
      id: string;
      action: string;
      project_id: string | null;
      project_name: string | null;
      details: Record<string, unknown> | null;
      created_at: Date;
    }>(`
      SELECT 
        al.id,
        al.action,
        al.project_id,
        p.name as project_name,
        al.details,
        al.created_at
      FROM audit_logs al
      LEFT JOIN projects p ON p.id = al.project_id
      ORDER BY al.created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      projectId: row.project_id,
      projectName: row.project_name,
      details: row.details,
      createdAt: row.created_at,
    }));
  },

  async getUserStats(_userId: string): Promise<StatsOverview & { projects: ProjectStats[] }> {
    // For now, regular users see global stats but filtered project list
    // In a full implementation, you'd track project ownership per user
    const overview = await this.getOverview();
    const projects = await this.getProjectsStats();
    
    return {
      ...overview,
      projects,
    };
  },
};
