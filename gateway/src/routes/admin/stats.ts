import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { statsService } from '../../services/stats.js';

const timelineQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(30),
});

const activityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const statsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get overview stats
  fastify.get('/stats/overview', async (_request, reply) => {
    try {
      const overview = await statsService.getOverview();
      return reply.send(overview);
    } catch (error) {
      fastify.log.error(error, 'Failed to get stats overview');
      return reply.status(500).send({ error: 'Failed to get stats overview' });
    }
  });

  // Get all projects with stats
  fastify.get('/stats/projects', async (_request, reply) => {
    try {
      const projects = await statsService.getProjectsStats();
      return reply.send({ projects });
    } catch (error) {
      fastify.log.error(error, 'Failed to get project stats');
      return reply.status(500).send({ error: 'Failed to get project stats' });
    }
  });

  // Get timeline data
  fastify.get('/stats/timeline', async (request, reply) => {
    try {
      const { days } = timelineQuerySchema.parse(request.query);
      const timeline = await statsService.getTimeline(days);
      return reply.send({ timeline });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid parameters', details: error.errors });
      }
      fastify.log.error(error, 'Failed to get timeline');
      return reply.status(500).send({ error: 'Failed to get timeline' });
    }
  });

  // Get recent activity
  fastify.get('/activity', async (request, reply) => {
    try {
      const { limit } = activityQuerySchema.parse(request.query);
      const activity = await statsService.getActivity(limit);
      return reply.send({ activity });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid parameters', details: error.errors });
      }
      fastify.log.error(error, 'Failed to get activity');
      return reply.status(500).send({ error: 'Failed to get activity' });
    }
  });
};
