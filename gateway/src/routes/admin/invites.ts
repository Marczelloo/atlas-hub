import type { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../services/auth.js';
import { BadRequestError } from '../../lib/errors.js';

const createInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const inviteRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List invite keys
  fastify.get('/', async (request, reply) => {
    const invites = await authService.listInviteKeys();
    return reply.send({ data: invites });
  });

  // Create invite key
  fastify.post('/', async (request, reply) => {
    const parsed = createInviteSchema.safeParse(request.body || {});
    if (!parsed.success) {
      throw new BadRequestError('Invalid request body');
    }

    const result = await authService.createInviteKey(request.user!.id, parsed.data);

    return reply.status(201).send({
      data: {
        invite: result.inviteKey,
        key: result.key, // Only returned once
      },
    });
  });

  // Delete invite key
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await authService.deleteInviteKey(request.params.id);
    return reply.status(204).send();
  });
};
