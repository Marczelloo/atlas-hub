import { platformDb } from '../db/platform.js';
import { decrypt } from '../lib/crypto.js';
import { NotFoundError } from '../lib/errors.js';

export const projectDbCredsService = {
  async getCredentials(projectId: string): Promise<{ owner: string; app: string }> {
    const result = await platformDb.query<{
      role: 'owner' | 'app';
      encrypted_connection_string: string;
      iv: string;
      auth_tag: string;
    }>(
      `SELECT role, encrypted_connection_string, iv, auth_tag
       FROM project_db_creds
       WHERE project_id = $1`,
      [projectId]
    );

    if (result.rows.length !== 2) {
      throw new NotFoundError('Project database credentials not found');
    }

    const creds: { owner?: string; app?: string } = {};

    for (const row of result.rows) {
      const decrypted = decrypt(row.encrypted_connection_string, row.iv, row.auth_tag);
      creds[row.role] = decrypted;
    }

    if (!creds.owner || !creds.app) {
      throw new Error('Incomplete project database credentials');
    }

    return { owner: creds.owner, app: creds.app };
  },
};
