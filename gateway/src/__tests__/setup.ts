/**
 * Test setup utilities for integration tests.
 *
 * These tests require a running Postgres and MinIO instance.
 * Run with: pnpm test:e2e (after docker-compose up)
 */
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { platformDb } from '../db/platform.js';
import { config } from '../config/env.js';

export interface TestContext {
  app: FastifyInstance;
  adminToken: string;
}

let testApp: FastifyInstance | null = null;

export async function getTestApp(): Promise<FastifyInstance> {
  if (!testApp) {
    testApp = await buildApp();
    await testApp.ready();
  }
  return testApp;
}

export async function closeTestApp(): Promise<void> {
  if (testApp) {
    await testApp.close();
    testApp = null;
  }
}

export function getAdminHeaders(withContentType = true): Record<string, string> {
  // Use dev admin token from config
  const headers: Record<string, string> = {
    'x-dev-admin-token': config.security.devAdminToken || '',
  };
  if (withContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export function getPublicHeaders(apiKey: string, withContentType = true): Record<string, string> {
  const headers: Record<string, string> = {
    'x-api-key': apiKey,
  };
  if (withContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export async function cleanupTestProject(projectId: string): Promise<void> {
  try {
    // Delete project (will cascade cleanup)
    await platformDb.query('DELETE FROM projects WHERE id = $1', [projectId]);
  } catch {
    // Ignore errors during cleanup
  }
}
