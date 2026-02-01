import { describe, it, expect } from 'vitest';
import { hashApiKey, generateApiKey, constantTimeCompare, encrypt, decrypt } from './crypto.js';

describe('hashApiKey', () => {
  it('produces consistent SHA-256 hash', () => {
    const key = 'pk_test_key_12345';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('produces different hashes for different keys', () => {
    const hash1 = hashApiKey('pk_key1');
    const hash2 = hashApiKey('pk_key2');
    expect(hash1).not.toBe(hash2);
  });
});

describe('generateApiKey', () => {
  it('generates publishable key with pk_ prefix', () => {
    const key = generateApiKey('pk');
    expect(key.startsWith('pk_')).toBe(true);
    expect(key.length).toBeGreaterThan(40);
  });

  it('generates secret key with sk_ prefix', () => {
    const key = generateApiKey('sk');
    expect(key.startsWith('sk_')).toBe(true);
  });

  it('generates unique keys', () => {
    const key1 = generateApiKey('pk');
    const key2 = generateApiKey('pk');
    expect(key1).not.toBe(key2);
  });
});

describe('constantTimeCompare', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeCompare('hello', 'hello')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(constantTimeCompare('hello', 'world')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(constantTimeCompare('short', 'longer string')).toBe(false);
  });
});

describe('encrypt/decrypt', () => {
  // These tests require PLATFORM_MASTER_KEY env var
  it('encrypts and decrypts string', () => {
    const original = 'postgresql://user:pass@localhost:5432/db';
    const encrypted = encrypt(original);

    expect(encrypted.encrypted).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    expect(encrypted.encrypted).not.toBe(original);

    const decrypted = decrypt(encrypted.encrypted, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(original);
  });
});
