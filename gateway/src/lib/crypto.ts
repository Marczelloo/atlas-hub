import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { config } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getMasterKeyBuffer(): Buffer {
  // Master key should be 32 bytes (256 bits) for AES-256
  const key = config.security.platformMasterKey;
  if (key.length === 64) {
    // Hex-encoded 32 bytes
    return Buffer.from(key, 'hex');
  }
  if (key.length >= 32) {
    // Use first 32 bytes
    return Buffer.from(key.slice(0, 32), 'utf8');
  }
  throw new Error('PLATFORM_MASTER_KEY must be at least 32 characters');
}

export function encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const key = getMasterKeyBuffer();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const key = getMasterKeyBuffer();
  const ivBuffer = Buffer.from(iv, 'base64');
  const authTagBuffer = Buffer.from(authTag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(prefix: 'pk' | 'sk' = 'pk'): string {
  // Format: prefix_base64url(32 random bytes)
  const randomPart = randomBytes(32).toString('base64url');
  return `${prefix}_${randomPart}`;
}

export function constantTimeCompare(a: string, b: string): boolean {
  // Hash both values first to ensure equal length
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function generateSecurePassword(length = 32): string {
  return randomBytes(length).toString('base64url');
}
