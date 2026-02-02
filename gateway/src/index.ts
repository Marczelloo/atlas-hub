import { config as dotenvConfig } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root (2 levels up from src/)
// In production (dist/), .env may be at container root or not exist
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  dotenvConfig({ path: envPath });
}

// Import after dotenv loads
const { config } = await import('./config/env.js');
const { buildApp } = await import('./app.js');
const { runMigrations } = await import('./db/migrations/run.js');

const start = async () => {
  // Run migrations on startup
  try {
    console.log('Checking database migrations...');
    await runMigrations();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`AtlasHub Gateway running on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
