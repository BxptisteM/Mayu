import 'dotenv/config';

import { pool } from '../database/client.js';
import { connectDiscord, disconnectDiscord } from '../discord/client.js';
import { selectArticles } from '../editorial/selector.js';
import { publishArticle } from '../services/publication.service.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { CATEGORIES, type Category } from '../sources/categories.js';

async function main(): Promise<void> {
  const requestedCategory = process.argv[2];
  const requestedLanguage = process.argv[3] ?? 'fr';

  if (!requestedCategory || !CATEGORIES.some((category) => category === requestedCategory)) {
    throw new Error(`Invalid category. Expected: ${CATEGORIES.join(', ')}`);
  }

  if (requestedLanguage !== 'fr' && requestedLanguage !== 'en') {
    throw new Error('Expected language: fr or en');
  }

  const category = requestedCategory as Category;

  // Only one article is selected for this controlled test.
  const [article] = await selectArticles(category, env.DISCORD_GUILD_ID, 1);

  if (!article) {
    logger.info({ category }, 'No article available for publication');
    return;
  }

  logger.info(
    {
      category,
      articleId: article.id,
      title: article.title,
      score: article.score,
    },
    'Selected article for publication test',
  );

  await connectDiscord();

  const result = await publishArticle(article, env.DISCORD_GUILD_ID, requestedLanguage);

  logger.info(result, 'Publication test completed');
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    logger.error({ err: error }, 'Publication test failed');
    process.exitCode = 1;
  } finally {
    await disconnectDiscord();
    await pool.end();
  }
}

void run();
