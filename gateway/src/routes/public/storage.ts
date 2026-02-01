import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { signedUploadRequestSchema, signedDownloadRequestSchema } from '@atlashub/shared';
import type { ProjectContext } from '@atlashub/shared';
import { storageService } from '../../services/storage.js';
import { BadRequestError, ForbiddenError } from '../../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    projectContext: ProjectContext;
  }
}

export const storageRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get signed upload URL
  fastify.post('/signed-upload', async (request: FastifyRequest, reply) => {
    const parseResult = signedUploadRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError('Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const { projectContext } = request;
    const { bucket, path, contentType, maxSize } = parseResult.data;

    const result = await storageService.getSignedUploadUrl(
      projectContext.projectId,
      bucket,
      path,
      contentType,
      maxSize
    );

    return reply.send({ data: result });
  });

  // Get signed download URL
  fastify.get<{ Querystring: { bucket: string; objectKey: string } }>(
    '/signed-download',
    async (request, reply) => {
      const parseResult = signedDownloadRequestSchema.safeParse({
        bucket: request.query.bucket,
        objectKey: request.query.objectKey,
      });
      if (!parseResult.success) {
        throw new BadRequestError(
          'Invalid query parameters',
          parseResult.error.flatten().fieldErrors
        );
      }

      const { projectContext } = request;
      const { bucket, objectKey } = parseResult.data;

      const result = await storageService.getSignedDownloadUrl(
        projectContext.projectId,
        bucket,
        objectKey
      );

      return reply.send({ data: result });
    }
  );

  // List objects (secret key only)
  fastify.get<{ Querystring: { bucket: string; prefix?: string; limit?: string } }>(
    '/list',
    async (request, reply) => {
      const { projectContext } = request;

      if (projectContext.keyType !== 'secret') {
        throw new ForbiddenError('Secret key required to list objects');
      }

      const { bucket, prefix, limit } = request.query;
      if (!bucket) {
        throw new BadRequestError('bucket query parameter is required');
      }

      const result = await storageService.listObjects(
        projectContext.projectId,
        bucket,
        prefix,
        limit ? parseInt(limit, 10) : undefined
      );

      return reply.send({ data: result });
    }
  );

  // Delete object
  fastify.delete<{ Querystring: { bucket: string; objectKey: string } }>(
    '/object',
    async (request, reply) => {
      const { projectContext } = request;
      const { bucket, objectKey } = request.query;

      if (!bucket || !objectKey) {
        throw new BadRequestError('bucket and objectKey query parameters are required');
      }

      await storageService.deleteObject(projectContext.projectId, bucket, objectKey);
      return reply.status(204).send();
    }
  );
};
