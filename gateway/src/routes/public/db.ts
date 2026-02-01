import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { tableNameSchema, insertBodySchema, updateBodySchema } from '@atlashub/shared';
import type { ProjectContext } from '@atlashub/shared';
import { crudService } from '../../services/crud.js';
import { BadRequestError } from '../../lib/errors.js';
import { parseFilters, parseOrder, parseSelect } from '../../lib/query-parser.js';

declare module 'fastify' {
  interface FastifyRequest {
    projectContext: ProjectContext;
  }
}

export const dbRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get available tables
  fastify.get('/tables', async (request: FastifyRequest, reply) => {
    const tables = await crudService.getTables(request.projectContext.projectId);
    return reply.send({ data: tables });
  });

  // SELECT rows from a table
  fastify.get<{ Params: { table: string }; Querystring: Record<string, string> }>(
    '/:table',
    async (request, reply) => {
      const tableResult = tableNameSchema.safeParse(request.params.table);
      if (!tableResult.success) {
        throw new BadRequestError('Invalid table name');
      }

      const { projectContext } = request;
      const { table } = request.params;
      const query = request.query;

      const select = parseSelect(query.select);
      const order = parseOrder(query.order);
      const limit = query.limit ? parseInt(query.limit, 10) : undefined;
      const offset = query.offset ? parseInt(query.offset, 10) : undefined;
      const filters = parseFilters(query);

      const result = await crudService.select(projectContext.projectId, table, {
        select,
        order,
        limit,
        offset,
        filters,
      });

      return reply.send({ data: result.rows, meta: { rowCount: result.rowCount } });
    }
  );

  // INSERT rows
  fastify.post<{ Params: { table: string } }>('/:table', async (request, reply) => {
    const tableResult = tableNameSchema.safeParse(request.params.table);
    if (!tableResult.success) {
      throw new BadRequestError('Invalid table name');
    }

    const bodyResult = insertBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw new BadRequestError('Invalid request body', bodyResult.error.flatten().fieldErrors);
    }

    const { projectContext } = request;
    const { table } = request.params;
    const { rows, returning } = bodyResult.data;

    const result = await crudService.insert(projectContext.projectId, table, rows, returning);
    return reply.status(201).send({ data: result });
  });

  // UPDATE rows
  fastify.patch<{ Params: { table: string }; Querystring: Record<string, string> }>(
    '/:table',
    async (request, reply) => {
      const tableResult = tableNameSchema.safeParse(request.params.table);
      if (!tableResult.success) {
        throw new BadRequestError('Invalid table name');
      }

      const bodyResult = updateBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        throw new BadRequestError('Invalid request body', bodyResult.error.flatten().fieldErrors);
      }

      const { projectContext } = request;
      const { table } = request.params;
      const { values, returning } = bodyResult.data;
      const filters = parseFilters(request.query);

      if (filters.length === 0) {
        throw new BadRequestError('At least one filter is required for UPDATE');
      }

      const result = await crudService.update(
        projectContext.projectId,
        table,
        values,
        filters,
        returning
      );
      return reply.send({ data: result });
    }
  );

  // DELETE rows
  fastify.delete<{ Params: { table: string }; Querystring: Record<string, string> }>(
    '/:table',
    async (request, reply) => {
      const tableResult = tableNameSchema.safeParse(request.params.table);
      if (!tableResult.success) {
        throw new BadRequestError('Invalid table name');
      }

      const { projectContext } = request;
      const { table } = request.params;
      const filters = parseFilters(request.query);

      if (filters.length === 0) {
        throw new BadRequestError('At least one filter is required for DELETE');
      }

      const result = await crudService.delete(projectContext.projectId, table, filters);
      return reply.send({ data: { deletedCount: result.rowCount } });
    }
  );
};
