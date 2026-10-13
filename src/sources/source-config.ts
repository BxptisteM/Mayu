import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { z } from 'zod';

import { CATEGORIES } from './categories.js';

const sourceSchema = z.object({
  name: z.string().trim().min(1),
  url: z
    .url()
    .refine(
      (value) => ['http:', 'https:'].includes(new URL(value).protocol),
      'Source URL must use HTTP or HTTPS',
    ),
  type: z.literal('rss'),
  tags: z.array(z.enum(CATEGORIES)).min(1),
  enabled: z.boolean().default(true),
});

const sourceListSchema = z.array(sourceSchema).min(1);

export type SourceConfig = z.infer<typeof sourceSchema>;

export async function loadSourceConfig(): Promise<SourceConfig[]> {
  const filePath = resolve(process.cwd(), 'sources.json');
  const content = await readFile(filePath, 'utf8');

  const parsed: unknown = JSON.parse(content);
  const config = sourceListSchema.parse(parsed);

  const urls = config.map((source) => source.url);

  if (new Set(urls).size !== urls.length) {
    throw new Error('Duplicate source URLs found in sources.json');
  }

  return config;
}
