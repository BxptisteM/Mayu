import 'dotenv/config';

import { db, pool } from '../database/client.js';
import { sources } from '../database/schema/index.js';
import { logger } from '../shared/logger.js';

const initialSources = [
  {
    name: 'BleepingComputer',
    url: 'https://www.bleepingcomputer.com/feed/',
    type: 'rss',
    tags: ['CYBER', 'NEWS'],
  },
  {
    name: 'Hacker News',
    url: 'https://hnrss.org/frontpage',
    type: 'rss',
    tags: ['NEWS', 'IA', 'CYBER', 'OS', 'HARDWARE'],
  },
  {
    name: 'The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    type: 'rss',
    tags: ['CYBER'],
  },
] as const;

async function main(): Promise<void> {
  for (const source of initialSources) {
    await db
      .insert(sources)
      .values({
        name: source.name,
        url: source.url,
        type: source.type,
        tags: [...source.tags],
      })
      .onConflictDoNothing({ target: sources.url });
  }

  logger.info({ count: initialSources.length }, 'Initial sources seeded');
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Source seeding failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
