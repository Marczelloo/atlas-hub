import type { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { authService } from '../../services/auth.js';
import { ForbiddenError } from '../../lib/errors.js';

export const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List users
  fastify.get('/', async (_request, reply) => {
    const users = await authService.listUsers();
    return reply.send({ data: users });
  });

  // Delete user
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    // Prevent self-deletion
    if (request.params.id === request.user!.id) {
      throw new ForbiddenError('Cannot delete your own account');
    }

    await authService.deleteUser(request.params.id);
    return reply.status(204).send();
  });
};
