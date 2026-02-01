import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { platformDb } from '../db/platform.js';
import { config } from '../config/env.js';
import { hashApiKey } from '../lib/crypto.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../lib/errors.js';

const BCRYPT_ROUNDS = 12;

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayloadCustom extends JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export interface InviteKey {
  id: string;
  keyPrefix: string;
  createdBy: string;
  usedBy: string | null;
  maxUses: number;
  useCount: number;
  expiresAt: Date | null;
  createdAt: Date;
}

function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(config.security.jwtSecret);
}

export const authService = {
  // ==================== User Management ====================

  async createUser(
    email: string,
    password: string,
    role: 'admin' | 'user' = 'user'
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const result = await platformDb.query<{
        id: string;
        email: string;
        role: 'admin' | 'user';
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, email, role, created_at, updated_at`,
        [email.toLowerCase(), passwordHash, role]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new BadRequestError('Email already registered');
      }
      throw error;
    }
  },

  async validateCredentials(email: string, password: string): Promise<User> {
    const result = await platformDb.query<{
      id: string;
      email: string;
      password_hash: string;
      role: 'admin' | 'user';
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const row = result.rows[0];
    const isValid = await bcrypt.compare(password, row.password_hash);

    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async getUserById(userId: string): Promise<User | null> {
    const result = await platformDb.query<{
      id: string;
      email: string;
      role: 'admin' | 'user';
      created_at: Date;
      updated_at: Date;
    }>('SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async listUsers(): Promise<User[]> {
    const result = await platformDb.query<{
      id: string;
      email: string;
      role: 'admin' | 'user';
      created_at: Date;
      updated_at: Date;
    }>('SELECT id, email, role, created_at, updated_at FROM users ORDER BY created_at DESC');

    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async deleteUser(userId: string): Promise<void> {
    const result = await platformDb.query('DELETE FROM users WHERE id = $1', [userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('User not found');
    }
  },

  async hasAnyUser(): Promise<boolean> {
    const result = await platformDb.query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count) > 0;
  },

  // ==================== JWT Tokens ====================

  async generateToken(user: User): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.security.sessionExpiryHours);

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    } as JwtPayloadCustom)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .setSubject(user.id)
      .sign(getJwtSecretKey());

    return token;
  },

  async verifyToken(token: string): Promise<JwtPayloadCustom> {
    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      return payload as JwtPayloadCustom;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  },

  // ==================== Invite Keys ====================

  async createInviteKey(
    createdBy: string,
    options: { maxUses?: number; expiresInDays?: number } = {}
  ): Promise<{ inviteKey: InviteKey; key: string }> {
    const key = `inv_${randomBytes(16).toString('base64url')}`;
    const keyHash = hashApiKey(key);
    const keyPrefix = key.slice(0, 8);

    const expiresAt = options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await platformDb.query<{
      id: string;
      key_prefix: string;
      created_by: string;
      used_by: string | null;
      max_uses: number;
      use_count: number;
      expires_at: Date | null;
      created_at: Date;
    }>(
      `INSERT INTO invite_keys (key_hash, key_prefix, created_by, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, key_prefix, created_by, used_by, max_uses, use_count, expires_at, created_at`,
      [keyHash, keyPrefix, createdBy, options.maxUses || 1, expiresAt]
    );

    const row = result.rows[0];
    return {
      inviteKey: {
        id: row.id,
        keyPrefix: row.key_prefix,
        createdBy: row.created_by,
        usedBy: row.used_by,
        maxUses: row.max_uses,
        useCount: row.use_count,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      },
      key,
    };
  },

  async validateInviteKey(key: string): Promise<InviteKey> {
    const keyHash = hashApiKey(key);

    const result = await platformDb.query<{
      id: string;
      key_prefix: string;
      created_by: string;
      used_by: string | null;
      max_uses: number;
      use_count: number;
      expires_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, key_prefix, created_by, used_by, max_uses, use_count, expires_at, created_at
       FROM invite_keys
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      throw new BadRequestError('Invalid invite key');
    }

    const row = result.rows[0];

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      throw new BadRequestError('Invite key has expired');
    }

    if (row.use_count >= row.max_uses) {
      throw new BadRequestError('Invite key has been used');
    }

    return {
      id: row.id,
      keyPrefix: row.key_prefix,
      createdBy: row.created_by,
      usedBy: row.used_by,
      maxUses: row.max_uses,
      useCount: row.use_count,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  },

  async useInviteKey(keyId: string, usedBy: string): Promise<void> {
    await platformDb.query(
      `UPDATE invite_keys 
       SET use_count = use_count + 1, used_by = $2
       WHERE id = $1`,
      [keyId, usedBy]
    );
  },

  async listInviteKeys(createdBy?: string): Promise<InviteKey[]> {
    const query = createdBy
      ? 'SELECT id, key_prefix, created_by, used_by, max_uses, use_count, expires_at, created_at FROM invite_keys WHERE created_by = $1 ORDER BY created_at DESC'
      : 'SELECT id, key_prefix, created_by, used_by, max_uses, use_count, expires_at, created_at FROM invite_keys ORDER BY created_at DESC';

    const result = await platformDb.query<{
      id: string;
      key_prefix: string;
      created_by: string;
      used_by: string | null;
      max_uses: number;
      use_count: number;
      expires_at: Date | null;
      created_at: Date;
    }>(query, createdBy ? [createdBy] : []);

    return result.rows.map((row) => ({
      id: row.id,
      keyPrefix: row.key_prefix,
      createdBy: row.created_by,
      usedBy: row.used_by,
      maxUses: row.max_uses,
      useCount: row.use_count,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  },

  async deleteInviteKey(keyId: string): Promise<void> {
    const result = await platformDb.query('DELETE FROM invite_keys WHERE id = $1', [keyId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Invite key not found');
    }
  },

  // ==================== Initial Admin Setup ====================

  async ensureAdminExists(): Promise<void> {
    const hasUsers = await this.hasAnyUser();

    if (!hasUsers && config.security.adminEmail && config.security.adminPassword) {
      console.log('Creating initial admin user from environment...');
      await this.createUser(config.security.adminEmail, config.security.adminPassword, 'admin');
      console.log(`Admin user created: ${config.security.adminEmail}`);
    }
  },
};
