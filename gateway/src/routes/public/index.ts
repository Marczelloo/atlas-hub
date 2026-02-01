import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { publicAuthMiddleware } from '../../middleware/public-auth.js';
import { dbRoutes } from './db.js';
import { storageRoutes } from './storage.js';

export const publicRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Apply public authentication (API key) to all routes
  fastify.addHook('onRequest', publicAuthMiddleware);

  // Register sub-routes
  await fastify.register(dbRoutes, { prefix: '/db' });
  await fastify.register(storageRoutes, { prefix: '/storage' });
};
