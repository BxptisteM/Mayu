import 'dotenv/config';

import { connectDiscord, disconnectDiscord } from './discord/client.js';
import { registerInteractionHandlers } from './discord/interactions.js';
import { logger } from './shared/logger.js';

async function bootstrap(): Promise<void> {
  logger.info('Starting Mayu');

  registerInteractionHandlers();

  await connectDiscord();

  logger.info('Mayu started successfully');
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down Mayu');

  await disconnectDiscord();

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

  await disconnectDiscord();

  process.exitCode = 1;
});
