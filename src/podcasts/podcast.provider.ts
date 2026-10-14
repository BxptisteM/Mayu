import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import Parser from 'rss-parser';
import { z } from 'zod';

import { logger } from '../shared/logger.js';

const MAX_FEED_BYTES = 32 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;

const podcastConfigSchema = z.array(
  z.object({
    name: z.string().trim().min(1),
    url: z
      .url()
      .refine(
        (value) => ['https:', 'http:'].includes(new URL(value).protocol),
        'Podcast feed must use HTTP or HTTPS',
      ),
    enabled: z.boolean().default(true),
  }),
);

export interface PodcastEpisode {
  podcastName: string;
  guid: string;
  title: string;
  url: string;
  description: string;
  feedUrl: string;
  publishedAt: Date;
}

const parser = new Parser();

function cleanDescription(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

async function downloadPodcastFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mayu/1.0 (Technology Podcast Aggregator)',
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  });

  if (!response.ok) {
    await response.body?.cancel();

    throw new Error(`Podcast feed request failed: HTTP ${response.status}`);
  }

  const declaredLength = Number(response.headers.get('content-length') ?? '0');

  if (declaredLength > MAX_FEED_BYTES) {
    await response.body?.cancel();

    throw new Error(`Podcast feed exceeds ${MAX_FEED_BYTES} bytes`);
  }

  const reader: ReadableStreamDefaultReader<Uint8Array> | undefined = response.body?.getReader();

  if (!reader) {
    throw new Error('Podcast feed response has no body');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      const value: Uint8Array = result.value;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_FEED_BYTES) {
        throw new Error(`Podcast feed exceeds ${MAX_FEED_BYTES} bytes`);
      }

      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  const xmlBytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    xmlBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(xmlBytes);
}

export async function fetchPodcastEpisodes(now = new Date()): Promise<PodcastEpisode[]> {
  const raw = await readFile(resolve(process.cwd(), 'podcasts.json'), 'utf8');

  const config: unknown = JSON.parse(raw);
  const podcasts = podcastConfigSchema.parse(config);

  const episodes: PodcastEpisode[] = [];

  for (const podcast of podcasts) {
    if (!podcast.enabled) {
      continue;
    }

    try {
      const xml = await downloadPodcastFeed(podcast.url);
      const feed = await parser.parseString(xml);

      let validEpisodes = 0;

      for (const item of feed.items) {
        const title = item.title?.trim();
        const link = item.link?.trim();
        const dateValue = item.isoDate ?? item.pubDate;

        if (!title || !link || !dateValue) {
          continue;
        }

        const publishedAt = new Date(dateValue);

        if (Number.isNaN(publishedAt.getTime()) || publishedAt > now) {
          continue;
        }

        // Retain only episodes from the last seven days.
        if (publishedAt.getTime() < now.getTime() - 7 * 86_400_000) {
          continue;
        }

        episodes.push({
          podcastName: podcast.name,
          guid: item.guid?.trim() || link,
          title,
          url: link,
          description: cleanDescription(item.contentSnippet ?? item.content),
          publishedAt,
          feedUrl: podcast.url,
        });

        validEpisodes++;
      }

      logger.info(
        {
          podcast: podcast.name,
          feedItems: feed.items.length,
          recentEpisodes: validEpisodes,
        },
        'Podcast feed processed',
      );
    } catch (error: unknown) {
      logger.warn(
        {
          err: error,
          podcast: podcast.name,
          feedUrl: podcast.url,
        },
        'Podcast feed collection failed',
      );
    }
  }

  return episodes.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, 10);
}
