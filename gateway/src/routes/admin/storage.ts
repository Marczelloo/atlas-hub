import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { platformDb } from '../../db/platform.js';
import { storageService } from '../../services/storage.js';
import { NotFoundError, BadRequestError } from '../../lib/errors.js';
import { projectService } from '../../services/project.js';
import { signedUploadRequestSchema } from '@atlashub/shared';
import { auditService } from '../../services/audit.js';

export const adminStorageRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List buckets in project
  fastify.get<{ Params: { id: string } }>('/projects/:id/buckets', async (request, reply) => {
    const project = await projectService.getProject(request.params.id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const result = await platformDb.query<{
      id: string;
      name: string;
      created_at: Date;
    }>(`SELECT id, name, created_at FROM buckets WHERE project_id = $1 ORDER BY name`, [
      request.params.id,
    ]);

    return reply.send({
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
      })),
    });
  });

  // List files in a bucket
  fastify.get<{ Params: { id: string; bucketName: string }; Querystring: { prefix?: string } }>(
    '/projects/:id/buckets/:bucketName/files',
    async (request, reply) => {
      const project = await projectService.getProject(request.params.id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const result = await storageService.listObjects(
        request.params.id,
        request.params.bucketName,
        request.query.prefix,
        100
      );

      return reply.send({ data: result.objects });
    }
  );

  // Get signed upload URL (admin endpoint for dashboard)
  fastify.post<{ Params: { id: string } }>(
    '/projects/:id/signed-upload',
    async (request, reply) => {
      const project = await projectService.getProject(request.params.id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const parseResult = signedUploadRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new BadRequestError('Invalid request body');
      }

      const { bucket, path, contentType, maxSize } = parseResult.data;

      const result = await storageService.getSignedUploadUrl(
        request.params.id,
        bucket,
        path,
        contentType,
        maxSize
      );

      // Log file upload
      await auditService.log({
        action: auditService.actions.FILE_UPLOADED,
        projectId: request.params.id,
        details: { bucket, path, contentType, size: maxSize },
      });

      return reply.send(result);
    }
  );

  // Get signed download URL (admin endpoint for dashboard)
  fastify.get<{
    Params: { id: string; bucketName: string };
    Querystring: { objectKey: string };
  }>(
    '/projects/:id/buckets/:bucketName/signed-download',
    async (request, reply) => {
      const project = await projectService.getProject(request.params.id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const { objectKey } = request.query;
      if (!objectKey) {
        throw new BadRequestError('objectKey is required');
      }

      const result = await storageService.getSignedDownloadUrl(
        request.params.id,
        request.params.bucketName,
        objectKey
      );

      return reply.send(result);
    }
  );

  // Delete file (admin endpoint for dashboard)
  fastify.delete<{ Params: { id: string; bucketName: string }; Querystring: { objectKey: string } }>(
    '/projects/:id/buckets/:bucketName/files',
    async (request, reply) => {
      const project = await projectService.getProject(request.params.id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const { objectKey } = request.query;
      if (!objectKey) {
        throw new BadRequestError('objectKey is required');
      }

      await storageService.deleteObject(request.params.id, request.params.bucketName, objectKey);

      // Log file deletion
      await auditService.log({
        action: auditService.actions.FILE_DELETED,
        projectId: request.params.id,
        details: { bucket: request.params.bucketName, objectKey },
      });

      return reply.send({ success: true });
    }
  );
};
