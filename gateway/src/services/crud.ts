import type { ParsedFilter, ParsedOrder, TableInfo } from '@atlashub/shared';
import { projectDb } from '../db/project.js';
import { config } from '../config/env.js';
import { buildWhereClause, buildOrderClause, buildSelectColumns } from '../lib/sql-builder.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';

// Cache for table info per project
const tableInfoCache = new Map<string, { tables: TableInfo[]; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute

export const crudService = {
  async getTables(projectId: string): Promise<TableInfo[]> {
    const cached = tableInfoCache.get(projectId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.tables;
    }

    const result = await projectDb.queryAsApp<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      projectId,
      `SELECT
         c.table_name,
         c.column_name,
         c.data_type,
         c.is_nullable,
         c.column_default
       FROM information_schema.columns c
       JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
       WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
       ORDER BY c.table_name, c.ordinal_position`
    );

    const tablesMap = new Map<string, TableInfo>();

    for (const row of result.rows) {
      let tableInfo = tablesMap.get(row.table_name);
      if (!tableInfo) {
        tableInfo = { tableName: row.table_name, columns: [] };
        tablesMap.set(row.table_name, tableInfo);
      }
      tableInfo.columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
      });
    }

    const tables = Array.from(tablesMap.values());
    tableInfoCache.set(projectId, { tables, timestamp: Date.now() });

    return tables;
  },

  async select(
    projectId: string,
    table: string,
    options: {
      select?: string[] | '*';
      order?: ParsedOrder;
      limit?: number;
      offset?: number;
      filters?: ParsedFilter[];
    }
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    // Validate table exists
    const tables = await this.getTables(projectId);
    const tableInfo = tables.find((t) => t.tableName === table);
    if (!tableInfo) {
      throw new NotFoundError(`Table "${table}" not found`);
    }

    const allowedColumns = tableInfo.columns.map((c) => c.name);

    // Validate order column
    if (options.order && !allowedColumns.includes(options.order.column)) {
      throw new BadRequestError(`Invalid order column: ${options.order.column}`);
    }

    // Validate filter columns
    if (options.filters) {
      for (const filter of options.filters) {
        if (!allowedColumns.includes(filter.column)) {
          throw new BadRequestError(`Invalid filter column: ${filter.column}`);
        }
      }
    }

    const selectCols = buildSelectColumns(options.select || '*', allowedColumns);
    const { clause: whereClause, values: whereValues } = buildWhereClause(options.filters || []);
    const orderClause = buildOrderClause(options.order);

    const limit = Math.min(
      options.limit || config.query.defaultRowsLimit,
      config.query.maxRowsPerQuery
    );
    const offset = options.offset || 0;

    const sql = `
      SELECT ${selectCols}
      FROM "${table}"
      ${whereClause}
      ${orderClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await projectDb.queryAsApp<Record<string, unknown>>(projectId, sql, whereValues);

    return { rows: result.rows, rowCount: result.rowCount || 0 };
  },

  async insert(
    projectId: string,
    table: string,
    rows: Record<string, unknown>[],
    returning = false
  ): Promise<Record<string, unknown>[]> {
    // Validate table exists
    const tables = await this.getTables(projectId);
    const tableInfo = tables.find((t) => t.tableName === table);
    if (!tableInfo) {
      throw new NotFoundError(`Table "${table}" not found`);
    }

    const allowedColumns = tableInfo.columns.map((c) => c.name);
    const results: Record<string, unknown>[] = [];

    for (const row of rows) {
      const columns: string[] = [];
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const [col, val] of Object.entries(row)) {
        if (!allowedColumns.includes(col)) {
          throw new BadRequestError(`Invalid column: ${col}`);
        }
        columns.push(`"${col}"`);
        values.push(val);
        placeholders.push(`$${paramIndex}`);
        paramIndex++;
      }

      const sql = `
        INSERT INTO "${table}" (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        ${returning ? 'RETURNING *' : ''}
      `;

      const result = await projectDb.queryAsApp<Record<string, unknown>>(projectId, sql, values);
      if (returning && result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }

    return results;
  },

  async update(
    projectId: string,
    table: string,
    values: Record<string, unknown>,
    filters: ParsedFilter[],
    returning = false
  ): Promise<Record<string, unknown>[]> {
    // Validate table exists
    const tables = await this.getTables(projectId);
    const tableInfo = tables.find((t) => t.tableName === table);
    if (!tableInfo) {
      throw new NotFoundError(`Table "${table}" not found`);
    }

    const allowedColumns = tableInfo.columns.map((c) => c.name);

    // Validate filter columns
    for (const filter of filters) {
      if (!allowedColumns.includes(filter.column)) {
        throw new BadRequestError(`Invalid filter column: ${filter.column}`);
      }
    }

    const setClauses: string[] = [];
    const updateValues: unknown[] = [];
    let paramIndex = 1;

    for (const [col, val] of Object.entries(values)) {
      if (!allowedColumns.includes(col)) {
        throw new BadRequestError(`Invalid column: ${col}`);
      }
      setClauses.push(`"${col}" = $${paramIndex}`);
      updateValues.push(val);
      paramIndex++;
    }

    const { clause: whereClause, values: whereValues } = buildWhereClause(filters, paramIndex);
    const allValues = [...updateValues, ...whereValues];

    const sql = `
      UPDATE "${table}"
      SET ${setClauses.join(', ')}
      ${whereClause}
      ${returning ? 'RETURNING *' : ''}
    `;

    const result = await projectDb.queryAsApp<Record<string, unknown>>(projectId, sql, allValues);
    return returning ? result.rows : [];
  },

  async delete(
    projectId: string,
    table: string,
    filters: ParsedFilter[]
  ): Promise<{ rowCount: number }> {
    // Validate table exists
    const tables = await this.getTables(projectId);
    const tableInfo = tables.find((t) => t.tableName === table);
    if (!tableInfo) {
      throw new NotFoundError(`Table "${table}" not found`);
    }

    const allowedColumns = tableInfo.columns.map((c) => c.name);

    // Validate filter columns
    for (const filter of filters) {
      if (!allowedColumns.includes(filter.column)) {
        throw new BadRequestError(`Invalid filter column: ${filter.column}`);
      }
    }

    const { clause: whereClause, values } = buildWhereClause(filters);

    const sql = `DELETE FROM "${table}" ${whereClause}`;

    const result = await projectDb.queryAsApp(projectId, sql, values);
    return { rowCount: result.rowCount || 0 };
  },

  clearCache(projectId?: string): void {
    if (projectId) {
      tableInfoCache.delete(projectId);
    } else {
      tableInfoCache.clear();
    }
  },
};
