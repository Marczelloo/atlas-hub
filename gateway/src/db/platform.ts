import { Pool, type PoolClient, type QueryResult } from 'pg';
import { config } from '../config/env.js';

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  max: config.postgres.maxPoolSize,
  idleTimeoutMillis: config.postgres.idleTimeoutMs,
  connectionTimeoutMillis: config.postgres.connectionTimeoutMs,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const platformDb = {
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return pool.query<T>(text, params);
  },

  async getClient(): Promise<PoolClient> {
    return pool.connect();
  },

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async end(): Promise<void> {
    await pool.end();
  },
};
