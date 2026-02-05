import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { backupService } from '../../services/backup.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';

const createBackupSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  backupType: z.enum(['platform', 'project', 'table']),
  tableName: z.string().max(255).optional(),
  format: z.enum(['sql', 'csv', 'json']).optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
});

export const backupRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List backups
  fastify.get('/', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };
    const backups = await backupService.listBackups(
      projectId === undefined ? undefined : projectId === 'null' ? null : projectId
    );
    return reply.send({ data: backups });
  });

  // Get single backup
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const backup = await backupService.getBackup(request.params.id);
    if (!backup) {
      throw new NotFoundError('Backup not found');
    }
    return reply.send({ data: backup });
  });

  // Create backup
  fastify.post('/', async (request, reply) => {
    const parsed = createBackupSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid request body', parsed.error.flatten().fieldErrors);
    }

    // Validate required fields based on backup type
    if (parsed.data.backupType === 'project' && !parsed.data.projectId) {
      throw new BadRequestError('projectId required for project backup');
    }
    if (parsed.data.backupType === 'table') {
      if (!parsed.data.projectId) {
        throw new BadRequestError('projectId required for table backup');
      }
      if (!parsed.data.tableName) {
        throw new BadRequestError('tableName required for table backup');
      }
    }

    const backup = await backupService.createBackup(parsed.data, request.user?.id);
    return reply.status(202).send({ data: backup });
  });

  // Get signed download URL for backup
  fastify.get<{ Params: { id: string } }>('/:id/download', async (request, reply) => {
    const result = await backupService.getDownloadUrl(request.params.id);
    return reply.send({ data: result });
  });

  // Restore a backup (project backups only)
  fastify.post<{ Params: { id: string } }>('/:id/restore', async (request, reply) => {
    const result = await backupService.restoreBackup(request.params.id, request.user?.id);
    return reply.send({
      data: {
        success: result.success,
        warnings: result.warnings,
        message:
          result.warnings.length > 0
            ? `Restore completed with ${result.warnings.length} warning(s)`
            : 'Restore completed successfully',
      },
    });
  });

  // Delete backup
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await backupService.deleteBackup(request.params.id, request.user?.id);
    return reply.status(204).send();
  });

  // Cleanup expired backups (can be called manually or via cron)
  fastify.post('/cleanup', async (_request, reply) => {
    const count = await backupService.cleanupExpiredBackups();
    return reply.send({ data: { deletedCount: count } });
  });

  // Apply retention policy (smart cleanup)
  fastify.post('/retention', async (request, reply) => {
    const { projectId } = request.body as { projectId?: string | null };
    const result = await backupService.applyRetentionPolicy(
      projectId === undefined ? undefined : projectId
    );
    return reply.send({
      data: {
        deleted: result.deleted,
        kept: result.kept,
        message: `Retention applied: ${result.deleted} deleted, ${result.kept} kept`,
      },
    });
  });
};
