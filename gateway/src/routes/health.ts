import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { platformDb } from '../db/platform.js';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  fastify.get('/ready', async (_request, reply) => {
    try {
      // Check database connection
      await platformDb.query('SELECT 1');
      return reply.send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });
};
