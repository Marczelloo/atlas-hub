import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { config } from './config/env.js';
import { adminRoutes } from './routes/admin/index.js';
import { publicRoutes } from './routes/public/index.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { errorHandler } from './lib/errors.js';
import { runtimeSettings } from './services/runtime-settings.js';

export async function buildApp() {
  // Initialize runtime settings from config
  const minioProtocol = config.minio.useSSL ? 'https' : 'http';
  const minioPublicUrl = `${minioProtocol}://${config.minio.endpoint}:${config.minio.port}`;
  
  runtimeSettings.init({
    rateLimitMax: config.rateLimitMax,
    rateLimitWindowMs: config.rateLimitWindowMs,
    sqlMaxRows: config.query.maxRowsPerQuery,
    sqlStatementTimeoutMs: config.query.statementTimeoutMs,
    minioPublicUrl,
  });

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
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'x-api-key',
      'x-dev-admin-token',
      'x-request-id',
      'cf-access-jwt-assertion',
    ],
  });

  // Cookie support
  await app.register(cookie);

  // Rate limiting with dynamic settings
  await app.register(rateLimit, {
    max: () => runtimeSettings.getRateLimitMax(),
    timeWindow: () => runtimeSettings.getRateLimitWindowMs(),
    keyGenerator: (request) => {
      // Use project ID from context if available, otherwise IP
      const projectId = (request as unknown as { projectContext?: { projectId: string } })
        .projectContext?.projectId;
      return projectId || request.ip;
    },
  });

  // Request ID is already available via request.id

  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(publicRoutes, { prefix: '/v1' });

  return app;
}
