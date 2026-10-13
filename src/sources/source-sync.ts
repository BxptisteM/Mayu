import { db } from '../database/client.js';
import { sources } from '../database/schema/index.js';
import { logger } from '../shared/logger.js';

import { loadSourceConfig } from './source-config.js';

export async function synchronizeSources(): Promise<void> {
  const config = await loadSourceConfig();

  await db.transaction(async (tx) => {
    for (const source of config) {
      await tx
        .insert(sources)
        .values(source)
        .onConflictDoUpdate({
          target: sources.url,
          set: {
            name: source.name,
            type: source.type,
            tags: source.tags,
            enabled: source.enabled,
            updatedAt: new Date(),
          },
        });
    }
  });

  logger.info({ count: config.length }, 'Source configuration synchronized');
}
