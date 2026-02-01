import { Pool } from 'pg';
import { projectDbCredsService } from '../services/project-db-creds.js';
import { config } from '../config/env.js';

// Cache of project connection pools
const projectPools = new Map<string, { owner: Pool; app: Pool }>();

async function getProjectPools(projectId: string): Promise<{ owner: Pool; app: Pool }> {
  const cached = projectPools.get(projectId);
  if (cached) {
    return cached;
  }

  const creds = await projectDbCredsService.getCredentials(projectId);

  const ownerPool = new Pool({
    connectionString: creds.owner,
    max: 3, // Small pool per project
    idleTimeoutMillis: config.postgres.idleTimeoutMs,
    connectionTimeoutMillis: config.postgres.connectionTimeoutMs,
  });

  const appPool = new Pool({
    connectionString: creds.app,
    max: 3,
    idleTimeoutMillis: config.postgres.idleTimeoutMs,
    connectionTimeoutMillis: config.postgres.connectionTimeoutMs,
  });

  const pools = { owner: ownerPool, app: appPool };
  projectPools.set(projectId, pools);

  return pools;
}

export const projectDb = {
  async queryAsOwner<T extends Record<string, unknown> = Record<string, unknown>>(
    projectId: string,
    text: string,
    params?: unknown[]
  ) {
    const pools = await getProjectPools(projectId);
    return pools.owner.query<T>(text, params);
  },

  async queryAsApp<T extends Record<string, unknown> = Record<string, unknown>>(
    projectId: string,
    text: string,
    params?: unknown[]
  ) {
    const pools = await getProjectPools(projectId);
    return pools.app.query<T>(text, params);
  },

  async closeProjectPools(projectId: string): Promise<void> {
    const pools = projectPools.get(projectId);
    if (pools) {
      await pools.owner.end();
      await pools.app.end();
      projectPools.delete(projectId);
    }
  },

  async closeAllPools(): Promise<void> {
    for (const [projectId] of projectPools) {
      await this.closeProjectPools(projectId);
    }
  },
};
