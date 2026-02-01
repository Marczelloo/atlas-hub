import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { platformDb } from '../../db/platform.js';
import { storageService } from '../../services/storage.js';
import { NotFoundError } from '../../lib/errors.js';
import { projectService } from '../../services/project.js';

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
};
