import 'dotenv/config';

import { pool } from '../database/client.js';
import { synchronizeSources } from '../sources/source-sync.js';
import { logger } from '../shared/logger.js';

async function main(): Promise<void> {
  await synchronizeSources();

  logger.info('Source seeding completed successfully');
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    logger.error({ err: error }, 'Source seeding failed');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();
