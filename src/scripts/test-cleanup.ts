import 'dotenv/config';

import { pool } from '../database/client.js';
import { runDatabaseCleanup } from '../jobs/cleanup.job.js';
import { logger } from '../shared/logger.js';

try {
  const result = await runDatabaseCleanup();

  logger.info(result, 'Manual cleanup test completed');
} catch (error: unknown) {
  logger.error({ err: error }, 'Manual cleanup test failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
