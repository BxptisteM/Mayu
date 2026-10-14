import { and, eq, sql, inArray } from 'drizzle-orm';

import { db } from '../database/client.js';
import { articles, selections, publications } from '../database/schema/index.js';

export interface SelectionResult {
  selected: boolean;
  count: number;
}

export async function toggleArticleSelection(
  guildId: string,
  userId: string,
  articleId: string,
  messageId: string,
): Promise<SelectionResult> {
  return db.transaction(async (tx) => {
    // Prevent concurrent selection updates for the same user.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(
        hashtext(${`mayu:selection:${guildId}:${userId}`})
      )`,
    );

    // Ensure the article belongs to a published Discord message.
    const [publication] = await tx
      .select({ id: publications.id })
      .from(publications)
      .where(
        and(
          eq(publications.articleId, articleId),
          eq(publications.guildId, guildId),
          eq(publications.messageId, messageId),
        ),
      )
      .limit(1);

    if (!publication) {
      throw new Error('Article publication not found');
    }

    const conditions = and(
      eq(selections.guildId, guildId),
      eq(selections.userId, userId),
      eq(selections.articleId, articleId),
    );

    const [existing] = await tx
      .select({ id: selections.id })
      .from(selections)
      .where(conditions)
      .limit(1);

    let selected: boolean;

    if (existing) {
      await tx.delete(selections).where(conditions);
      selected = false;
    } else {
      await tx.insert(selections).values({
        guildId,
        userId,
        articleId,
      });
      selected = true;
    }

    const remaining = await tx
      .select({ id: selections.id })
      .from(selections)
      .where(and(eq(selections.guildId, guildId), eq(selections.userId, userId)));

    return {
      selected,
      count: remaining.length,
    };
  });
}

export async function getUserSelections(
  guildId: string,
  userId: string,
): Promise<
  Array<{
    id: string;
    title: string;
    url: string;
    description: string | null;
    summary: string | null;
    summaryLanguage: string | null;
  }>
> {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      description: articles.description,
      summary: articles.summary,
      summaryLanguage: articles.summaryLanguage,
    })
    .from(selections)
    .innerJoin(articles, eq(selections.articleId, articles.id))
    .where(and(eq(selections.guildId, guildId), eq(selections.userId, userId)))
    .orderBy(selections.selectedAt);
}

export async function clearUserSelections(
  guildId: string,
  userId: string,
  articleIds: string[],
): Promise<void> {
  if (articleIds.length === 0) {
    return;
  }

  await db
    .delete(selections)
    .where(
      and(
        eq(selections.guildId, guildId),
        eq(selections.userId, userId),
        inArray(selections.articleId, articleIds),
      ),
    );
}
