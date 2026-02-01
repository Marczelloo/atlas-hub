import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createProjectSchema } from '@atlashub/shared';
import { projectService } from '../../services/project.js';
import { apiKeyService } from '../../services/api-key.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';

export const projectRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List all projects
  fastify.get('/', async (_request, reply) => {
    const projects = await projectService.listProjects();
    return reply.send({ data: projects });
  });

  // Get single project
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const project = await projectService.getProject(request.params.id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    return reply.send({ data: project });
  });

  // Create project
  fastify.post('/', async (request, reply) => {
    const parseResult = createProjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError('Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const result = await projectService.createProject(parseResult.data);
    return reply.status(201).send({ data: result });
  });

  // Delete project
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await projectService.deleteProject(request.params.id);
    return reply.status(204).send();
  });

  // Get project API keys (without the actual key values)
  fastify.get<{ Params: { id: string } }>('/:id/keys', async (request, reply) => {
    const keys = await apiKeyService.listProjectKeys(request.params.id);
    return reply.send({ data: keys });
  });

  // Rotate API key
  fastify.post<{ Params: { id: string }; Body: { keyType: 'publishable' | 'secret' } }>(
    '/:id/keys/rotate',
    async (request, reply) => {
      const { keyType } = request.body as { keyType?: string };
      if (!keyType || (keyType !== 'publishable' && keyType !== 'secret')) {
        throw new BadRequestError('keyType must be "publishable" or "secret"');
      }

      const result = await apiKeyService.rotateKey(request.params.id, keyType);
      return reply.send({ data: result });
    }
  );

  // Revoke API key
  fastify.delete<{ Params: { id: string; keyId: string } }>(
    '/:id/keys/:keyId',
    async (request, reply) => {
      await apiKeyService.revokeKey(request.params.keyId);
      return reply.status(204).send();
    }
  );
};
