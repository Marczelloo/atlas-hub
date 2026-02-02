import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from '../../config/env.js';
import { platformDb } from '../../db/platform.js';
import { runtimeSettings } from '../../services/runtime-settings.js';
import { auditService } from '../../services/audit.js';

export interface PlatformSettings {
  // Server info
  version: string;
  nodeEnv: string;
  port: number;

  // Rate limiting
  rateLimitMax: number;
  rateLimitWindowMs: number;

  // SQL limits
  sqlMaxRows: number;
  sqlStatementTimeoutMs: number;

  // Storage
  minioEndpoint: string;
  minioPublicUrl: string;

  // Stats
  totalProjects: number;
  totalUsers: number;
  totalApiKeys: number;
}

export const settingsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get platform settings
  fastify.get('/settings', async (_request, reply) => {
    // Get counts from database
    const [projectsResult, usersResult, keysResult] = await Promise.all([
      platformDb.query<{ count: string }>('SELECT COUNT(*) as count FROM projects'),
      platformDb.query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
      platformDb.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM api_keys WHERE revoked_at IS NULL'
      ),
    ]);

    // Get current runtime settings
    const currentRuntimeSettings = runtimeSettings.get();

    const settings: PlatformSettings = {
      // Server info
      version: '0.1.0',
      nodeEnv: config.isDev ? 'development' : 'production',
      port: config.port,

      // Rate limiting (from runtime settings)
      rateLimitMax: currentRuntimeSettings.rateLimitMax,
      rateLimitWindowMs: currentRuntimeSettings.rateLimitWindowMs,

      // SQL limits (from runtime settings)
      sqlMaxRows: currentRuntimeSettings.sqlMaxRows,
      sqlStatementTimeoutMs: currentRuntimeSettings.sqlStatementTimeoutMs,

      // Storage (from runtime settings)
      minioEndpoint: `${config.minio.endpoint}:${config.minio.port}`,
      minioPublicUrl: currentRuntimeSettings.minioPublicUrl,

      // Stats
      totalProjects: parseInt(projectsResult.rows[0]?.count || '0', 10),
      totalUsers: parseInt(usersResult.rows[0]?.count || '0', 10),
      totalApiKeys: parseInt(keysResult.rows[0]?.count || '0', 10),
    };

    return reply.send(settings);
  });

  // Update rate limit settings
  fastify.put<{
    Body: { rateLimitMax?: number; rateLimitWindowMs?: number };
  }>('/settings/rate-limits', async (request, reply) => {
    const { rateLimitMax, rateLimitWindowMs } = request.body;

    if (rateLimitMax !== undefined && (typeof rateLimitMax !== 'number' || rateLimitMax < 1)) {
      return reply.status(400).send({ message: 'rateLimitMax must be a positive number' });
    }

    if (rateLimitWindowMs !== undefined && (typeof rateLimitWindowMs !== 'number' || rateLimitWindowMs < 1000)) {
      return reply.status(400).send({ message: 'rateLimitWindowMs must be at least 1000 (1 second)' });
    }

    const oldSettings = runtimeSettings.get();

    runtimeSettings.updateRateLimits(
      rateLimitMax ?? oldSettings.rateLimitMax,
      rateLimitWindowMs ?? oldSettings.rateLimitWindowMs
    );

    const newSettings = runtimeSettings.get();

    // Log the settings change
    await auditService.log({
      action: 'settings.updated',
      details: {
        oldRateLimitMax: oldSettings.rateLimitMax,
        oldRateLimitWindowMs: oldSettings.rateLimitWindowMs,
        newRateLimitMax: newSettings.rateLimitMax,
        newRateLimitWindowMs: newSettings.rateLimitWindowMs,
      },
    });

    return reply.send({
      message: 'Rate limits updated successfully',
      rateLimitMax: newSettings.rateLimitMax,
      rateLimitWindowMs: newSettings.rateLimitWindowMs,
    });
  });

  // Update database limit settings
  fastify.put<{
    Body: { sqlMaxRows?: number; sqlStatementTimeoutMs?: number };
  }>('/settings/database-limits', async (request, reply) => {
    const { sqlMaxRows, sqlStatementTimeoutMs } = request.body;

    if (sqlMaxRows !== undefined && (typeof sqlMaxRows !== 'number' || sqlMaxRows < 1)) {
      return reply.status(400).send({ message: 'sqlMaxRows must be a positive number' });
    }

    if (sqlStatementTimeoutMs !== undefined && (typeof sqlStatementTimeoutMs !== 'number' || sqlStatementTimeoutMs < 100)) {
      return reply.status(400).send({ message: 'sqlStatementTimeoutMs must be at least 100 (0.1 second)' });
    }

    const oldSettings = runtimeSettings.get();

    runtimeSettings.updateDbLimits(
      sqlMaxRows ?? oldSettings.sqlMaxRows,
      sqlStatementTimeoutMs ?? oldSettings.sqlStatementTimeoutMs
    );

    const newSettings = runtimeSettings.get();

    // Log the settings change
    await auditService.log({
      action: 'settings.database_limits.updated',
      details: {
        oldSqlMaxRows: oldSettings.sqlMaxRows,
        oldSqlStatementTimeoutMs: oldSettings.sqlStatementTimeoutMs,
        newSqlMaxRows: newSettings.sqlMaxRows,
        newSqlStatementTimeoutMs: newSettings.sqlStatementTimeoutMs,
      },
    });

    return reply.send({
      message: 'Database limits updated successfully',
      sqlMaxRows: newSettings.sqlMaxRows,
      sqlStatementTimeoutMs: newSettings.sqlStatementTimeoutMs,
    });
  });

  // Update storage settings
  fastify.put<{
    Body: { minioPublicUrl?: string };
  }>('/settings/storage', async (request, reply) => {
    const { minioPublicUrl } = request.body;

    if (minioPublicUrl !== undefined && (typeof minioPublicUrl !== 'string' || !minioPublicUrl.trim())) {
      return reply.status(400).send({ message: 'minioPublicUrl must be a non-empty string' });
    }

    // Validate URL format
    if (minioPublicUrl) {
      try {
        new URL(minioPublicUrl);
      } catch {
        return reply.status(400).send({ message: 'minioPublicUrl must be a valid URL' });
      }
    }

    const oldSettings = runtimeSettings.get();

    runtimeSettings.updateStorageSettings(minioPublicUrl ?? oldSettings.minioPublicUrl);

    const newSettings = runtimeSettings.get();

    // Log the settings change
    await auditService.log({
      action: 'settings.storage.updated',
      details: {
        oldMinioPublicUrl: oldSettings.minioPublicUrl,
        newMinioPublicUrl: newSettings.minioPublicUrl,
      },
    });

    return reply.send({
      message: 'Storage settings updated successfully',
      minioPublicUrl: newSettings.minioPublicUrl,
    });
  });
};
