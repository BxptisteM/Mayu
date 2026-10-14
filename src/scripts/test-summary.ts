import 'dotenv/config';

import { isNotNull, desc } from 'drizzle-orm';

import { db, pool } from '../database/client.js';
import { articles } from '../database/schema/index.js';
import { generateArticleSummary } from '../ai/summary.service.js';
import { getBudgetStatus } from '../ai/budget.service.js';
import { logger } from '../shared/logger.js';

async function main(): Promise<void> {
  const language = process.argv[2] ?? 'fr';

  if (language !== 'fr' && language !== 'en') {
    throw new Error('Expected language: fr or en');
  }

  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      description: articles.description,
      url: articles.url,
    })
    .from(articles)
    .where(isNotNull(articles.description))
    .orderBy(desc(articles.publishedAt))
    .limit(1);

  if (!article) {
    throw new Error('No article with a description found in database');
  }

  const summary = await generateArticleSummary(article, language);

  const budget = await getBudgetStatus();

  logger.info(
    {
      articleId: article.id,
      title: article.title,
      language,
      summary,
      budget,
    },
    'OpenRouter summary test completed',
  );
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    logger.error({ err: error }, 'OpenRouter summary test failed');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();
