/**
 * Vitest setup file for e2e tests.
 * Loads environment variables before tests run.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Load .env file from monorepo root
config({ path: resolve(__dirname, '../../../.env') });

// Set test-specific defaults if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
