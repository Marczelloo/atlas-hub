import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { adminRoutes } from './routes/admin/index.js';
import { publicRoutes } from './routes/public/index.js';
import { healthRoutes } from './routes/health.js';
import { errorHandler } from './lib/errors.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.isDev
        ? {
            target: 'pino-pretty',
            options: { colorize: true },
          }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    trustProxy: true,
    bodyLimit: config.bodyLimitBytes,
  });

  // Global error handler
  app.setErrorHandler(errorHandler);

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS for public API
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'x-api-key',
      'x-dev-admin-token',
      'x-request-id',
      'cf-access-jwt-assertion',
    ],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (request) => {
      // Use project ID from context if available, otherwise IP
      const projectId = (request as unknown as { projectContext?: { projectId: string } })
        .projectContext?.projectId;
      return projectId || request.ip;
    },
  });

  // Request ID decorator
  app.decorateRequest('requestId', '');
  app.addHook('onRequest', async (request) => {
    request.requestId = request.id;
  });

  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(publicRoutes, { prefix: '/v1' });

  return app;
}
