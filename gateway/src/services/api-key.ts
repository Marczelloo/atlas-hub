import { randomUUID } from 'node:crypto';
import type { ApiKey, ApiKeyType, ProjectContext } from '@atlashub/shared';
import { platformDb } from '../db/platform.js';
import { generateApiKey, hashApiKey, constantTimeCompare } from '../lib/crypto.js';
import { NotFoundError } from '../lib/errors.js';

export const apiKeyService = {
  async listProjectKeys(projectId: string): Promise<ApiKey[]> {
    const result = await platformDb.query<{
      id: string;
      project_id: string;
      key_type: ApiKeyType;
      key_prefix: string;
      created_at: Date;
      expires_at: Date | null;
      revoked_at: Date | null;
    }>(
      `SELECT id, project_id, key_type, key_prefix, created_at, expires_at, revoked_at
       FROM api_keys
       WHERE project_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [projectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      keyType: row.key_type,
      keyPrefix: row.key_prefix,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    }));
  },

  async validateKey(key: string): Promise<ProjectContext | undefined> {
    const keyHash = hashApiKey(key);

    const result = await platformDb.query<{
      id: string;
      project_id: string;
      key_type: ApiKeyType;
      key_hash: string;
    }>(
      `SELECT id, project_id, key_type, key_hash
       FROM api_keys
       WHERE revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())`
    );

    // Find matching key using constant-time comparison
    for (const row of result.rows) {
      if (constantTimeCompare(keyHash, row.key_hash)) {
        return {
          projectId: row.project_id,
          keyType: row.key_type,
          keyId: row.id,
        };
      }
    }

    return undefined;
  },

  async rotateKey(
    projectId: string,
    keyType: ApiKeyType
  ): Promise<{ apiKey: ApiKey; newKey: string }> {
    const prefix = keyType === 'publishable' ? 'pk' : 'sk';
    const newKey = generateApiKey(prefix);
    const newKeyHash = hashApiKey(newKey);
    const newKeyId = randomUUID();

    await platformDb.transaction(async (client) => {
      // Revoke old key
      await client.query(
        `UPDATE api_keys SET revoked_at = NOW()
         WHERE project_id = $1 AND key_type = $2 AND revoked_at IS NULL`,
        [projectId, keyType]
      );

      // Create new key
      await client.query(
        `INSERT INTO api_keys (id, project_id, key_type, key_hash, key_prefix)
         VALUES ($1, $2, $3, $4, $5)`,
        [newKeyId, projectId, keyType, newKeyHash, newKey.slice(0, 8)]
      );
    });

    const result = await platformDb.query<{
      id: string;
      project_id: string;
      key_type: ApiKeyType;
      key_prefix: string;
      created_at: Date;
      expires_at: Date | null;
      revoked_at: Date | null;
    }>('SELECT * FROM api_keys WHERE id = $1', [newKeyId]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create new API key');
    }

    const row = result.rows[0];
    return {
      apiKey: {
        id: row.id,
        projectId: row.project_id,
        keyType: row.key_type,
        keyPrefix: row.key_prefix,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
      },
      newKey,
    };
  },

  async revokeKey(keyId: string): Promise<void> {
    const result = await platformDb.query(
      `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
      [keyId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('API key not found or already revoked');
    }
  },
};
