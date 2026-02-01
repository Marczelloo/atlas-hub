import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ProjectContext } from '@atlashub/shared';
import { apiKeyService } from '../services/api-key.js';
import { UnauthorizedError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    projectContext: ProjectContext;
  }
}

export async function publicAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    throw new UnauthorizedError('Missing x-api-key header');
  }

  const projectContext = await apiKeyService.validateKey(apiKey);
  if (!projectContext) {
    throw new UnauthorizedError('Invalid API key');
  }

  request.projectContext = projectContext;
}
