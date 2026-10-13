import 'dotenv/config';

import { pool } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { CATEGORIES, type Category } from '../sources/categories.js';
import { collectArticles } from '../sources/collector.js';

async function main(): Promise<void> {
  const requestedCategory = process.argv[2];

  if (!requestedCategory || !CATEGORIES.some((category) => category === requestedCategory)) {
    throw new Error(`Invalid category. Expected one of: ${CATEGORIES.join(', ')}`);
  }

  const result = await collectArticles(requestedCategory as Category);

  logger.info(result, 'Manual collection test completed');
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    logger.error({ err: error }, 'Collection test failed');
    process.exitCode = 1;
  } finally {
    logger.debug('Closing database pool');
    await pool.end();
    logger.debug('Database pool closed');
  }
}

void run();
