import { eq } from 'drizzle-orm';

import { db } from '../database/client.js';
import { guildSettings } from '../database/schema/index.js';

export type Language = 'fr' | 'en';

export async function getGuildLanguage(guildId: string): Promise<Language> {
  const [settings] = await db
    .select({ language: guildSettings.language })
    .from(guildSettings)
    .where(eq(guildSettings.guildId, guildId))
    .limit(1);

  return settings?.language ?? 'fr';
}

export async function setGuildLanguage(guildId: string, language: Language): Promise<void> {
  await db
    .insert(guildSettings)
    .values({
      guildId,
      language,
    })
    .onConflictDoUpdate({
      target: guildSettings.guildId,
      set: {
        language,
        updatedAt: new Date(),
      },
    });
}
