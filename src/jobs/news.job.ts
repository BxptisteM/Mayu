import { and, eq, gte, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../database/client.js';
import { guildSettings, publications } from '../database/schema/index.js';
import { selectArticles } from '../editorial/selector.js';
import { logger } from '../shared/logger.js';
import { publishArticle } from '../services/publication.service.js';
import type { Category } from '../sources/categories.js';
import { collectArticles } from '../sources/collector.js';

export type NewsCategory = Exclude<Category, 'GITHUB' | 'PODCASTS'>;

export interface NewsJobResult {
  category: NewsCategory;
  requested: number;
  published: number;
  failed: number;
  remaining: number;
}

const activeJobs = new Set<string>();

function parisDayStart(now: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  const year = Number(value['year']);
  const month = Number(value['month']);
  const day = Number(value['day']);

  // Noon UTC is safely within the target Paris calendar day.
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));

  const parisHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(noonUtc),
  );

  const offsetHours = parisHour - 12;

  return new Date(Date.UTC(year, month - 1, day) - offsetHours * 60 * 60 * 1000);
}

async function countDailyPublications(guildId: string, category: NewsCategory): Promise<number> {
  const start = parisDayStart(new Date());

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(publications)
    .where(
      and(
        eq(publications.guildId, guildId),
        eq(publications.category, category),
        gte(publications.publishedAt, start),
      ),
    );

  return row?.total ?? 0;
}

async function getGuildLanguage(guildId: string): Promise<'fr' | 'en'> {
  const [settings] = await db
    .select({ language: guildSettings.language })
    .from(guildSettings)
    .where(eq(guildSettings.guildId, guildId))
    .limit(1);

  return settings?.language ?? 'fr';
}

export async function runNewsJob(
  category: NewsCategory,
  guildId: string,
  mode: 'daily' | 'more',
): Promise<NewsJobResult> {
  const jobKey = `${guildId}:${category}`;

  if (activeJobs.has(jobKey)) {
    throw new Error(`A ${category} publication job is already running`);
  }

  activeJobs.add(jobKey);

  try {
    const language = await getGuildLanguage(guildId);

    const dailyCount = await countDailyPublications(guildId, category);

    const requested =
      mode === 'more'
        ? env.ARTICLES_MORE_PUBLISH_LIMIT
        : Math.max(0, env.ARTICLES_DAILY_PUBLISH_LIMIT - dailyCount);

    if (requested === 0) {
      return {
        category,
        requested,
        published: 0,
        failed: 0,
        remaining: 0,
      };
    }

    if (mode === 'daily') {
      await collectArticles(category);
    }

    const candidates = await selectArticles(category, guildId, requested);

    let published = 0;
    let failed = 0;

    for (const article of candidates) {
      try {
        await publishArticle(article, guildId, language);
        published++;
      } catch (error: unknown) {
        failed++;

        logger.error(
          {
            err: error,
            category,
            articleId: article.id,
          },
          'Failed to publish selected article',
        );
      }
    }

    const result: NewsJobResult = {
      category,
      requested,
      published,
      failed,
      remaining: Math.max(0, requested - published),
    };

    logger.info({ ...result, mode }, 'News publication job completed');

    return result;
  } finally {
    activeJobs.delete(jobKey);
  }
}
