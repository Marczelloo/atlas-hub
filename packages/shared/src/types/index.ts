import { z } from 'zod';
import {
  projectSchema,
  apiKeySchema,
  apiKeyTypeSchema,
  fileMetadataSchema,
  tableInfoSchema,
  sqlResultSchema,
  auditLogSchema,
  auditActionSchema,
  errorResponseSchema,
  filterOperatorSchema,
  orderDirectionSchema,
} from '../schemas/index.js';

// ============================================================
// Inferred Types from Zod Schemas
// ============================================================

export type Project = z.infer<typeof projectSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type ApiKeyType = z.infer<typeof apiKeyTypeSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
export type TableInfo = z.infer<typeof tableInfoSchema>;
export type SqlResult = z.infer<typeof sqlResultSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type FilterOperator = z.infer<typeof filterOperatorSchema>;
export type OrderDirection = z.infer<typeof orderDirectionSchema>;

// ============================================================
// Additional Types (not from schemas)
// ============================================================

export interface ProjectContext {
  projectId: string;
  keyType: ApiKeyType;
  keyId: string;
}

export interface ProjectDbCreds {
  id: string;
  projectId: string;
  role: 'owner' | 'app';
  encryptedConnectionString: string; // AES-256-GCM encrypted
  iv: string; // base64 IV
  authTag: string; // base64 auth tag
}

export interface BucketInfo {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
}

export interface ParsedFilter {
  column: string;
  operator: FilterOperator;
  value: string | string[];
}

export interface ParsedOrder {
  column: string;
  direction: OrderDirection;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

export interface CreateProjectResponse {
  project: Project;
  publishableKey: string; // returned only once
  secretKey: string; // returned only once
}

export interface RotateKeyResponse {
  apiKey: ApiKey;
  newKey: string; // returned only once
}

// ============================================================
// Stats Types
// ============================================================

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

// ============================================================
// Config Types
// ============================================================

export interface GatewayConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  bodyLimitBytes: number;
  statementTimeoutMs: number;
  maxRowsPerQuery: number;
  presignedUrlExpirySeconds: number;
}

export interface CloudflareAccessConfig {
  teamDomain: string; // e.g., "myteam.cloudflareaccess.com"
  audience: string; // aud claim
  enabled: boolean;
}

export interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxPoolSize: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}
