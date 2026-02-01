import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sqlQuerySchema } from '@atlashub/shared';
import { sqlService } from '../../services/sql.js';
import { projectDb } from '../../db/project.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { projectService } from '../../services/project.js';

export const sqlRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List tables in project database
  fastify.get<{ Params: { id: string } }>('/projects/:id/tables', async (request, reply) => {
    const project = await projectService.getProject(request.params.id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const result = await projectDb.queryAsOwner<{
      table_name: string;
      table_type: string;
    }>(
      request.params.id,
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );

    return reply.send({
      data: result.rows.map((row) => ({
        name: row.table_name,
        type: row.table_type === 'BASE TABLE' ? 'table' : 'view',
      })),
    });
  });

  // Get table columns
  fastify.get<{ Params: { id: string; tableName: string } }>(
    '/projects/:id/tables/:tableName/columns',
    async (request, reply) => {
      const project = await projectService.getProject(request.params.id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const result = await projectDb.queryAsOwner<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        request.params.id,
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [request.params.tableName]
      );

      return reply.send({
        data: result.rows.map((row) => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
        })),
      });
    }
  );

  // Execute SQL query (admin only, uses owner connection)
  fastify.post<{ Params: { id: string } }>('/projects/:id/sql', async (request, reply) => {
    const project = await projectService.getProject(request.params.id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const parseResult = sqlQuerySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError('Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const result = await sqlService.executeAdminQuery(request.params.id, parseResult.data.sql);
    return reply.send({ data: result });
  });
};
