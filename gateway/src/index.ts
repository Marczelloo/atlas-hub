import { config as dotenvConfig } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root (2 levels up from src/)
dotenvConfig({ path: resolve(__dirname, '../../.env') });

// Import after dotenv loads
const { config } = await import('./config/env.js');
const { buildApp } = await import('./app.js');

const start = async () => {
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
