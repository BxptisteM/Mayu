import 'dotenv/config';

import { connectDiscord, disconnectDiscord } from './discord/client.js';
import { registerInteractionHandlers } from './discord/interactions.js';
import { logger } from './shared/logger.js';
import { connectDatabase } from './database/client.js';
import { synchronizeSources } from './sources/source-sync.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { recoverPublications } from './services/publication-recovery.service.js';

async function bootstrap(): Promise<void> {
  logger.info('Starting Mayu');

  await connectDatabase();
  logger.info('Database connected');

  await synchronizeSources();
  logger.info('Sources synchronized');

  registerInteractionHandlers();

  await connectDiscord();
  logger.info('Discord connected');
  logger.info('Mayu started successfully');

  await recoverPublications();

  startScheduler();
  logger.info('Scheduler started');
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down Mayu');

  stopScheduler();
  logger.info('Scheduler stopped');

  await disconnectDiscord();
  logger.info('Discord disconnected');
  logger.info('Mayu stopped');
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

bootstrap().catch(async (error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start Mayu');

  stopScheduler();
  await disconnectDiscord();

  process.exitCode = 1;
});
