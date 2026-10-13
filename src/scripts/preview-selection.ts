import 'dotenv/config';

import { env } from '../config/env.js';
import { pool } from '../database/client.js';
import { selectArticles } from '../editorial/selector.js';
import { logger } from '../shared/logger.js';
import { CATEGORIES, type Category } from '../sources/categories.js';

async function main(): Promise<void> {
  const requestedCategory = process.argv[2];

  if (!requestedCategory || !CATEGORIES.some((category) => category === requestedCategory)) {
    throw new Error(`Invalid category. Expected: ${CATEGORIES.join(', ')}`);
  }

  const category = requestedCategory as Category;

  const selected = await selectArticles(category, env.DISCORD_GUILD_ID, 5);

  logger.info(
    {
      category,
      count: selected.length,
      articles: selected.map((article) => ({
        title: article.title,
        source: article.sourceName,
        score: article.score,
        publishedAt: article.publishedAt.toISOString(),
        url: article.url,
      })),
    },
    'Editorial selection preview completed',
  );
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    logger.error({ err: error }, 'Editorial preview failed');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();
