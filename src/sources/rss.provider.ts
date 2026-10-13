import Parser from 'rss-parser';

import { env } from '../config/env.js';
import { normalizeUrl } from './url.js';

export interface CollectedArticle {
  title: string;
  url: string;
  description: string | null;
  publishedAt: Date;
}

const MAX_FEED_BYTES = 5 * 1024 * 1024;

const parser = new Parser();

function cleanText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || null;
}

async function downloadFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(env.SOURCES_FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mayu/1.0 (Technology News Aggregator)',
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  });

  if (!response.ok) {
    await response.body?.cancel();

    throw new Error(`RSS request failed with HTTP ${response.status}`);
  }

  const reader = response.body?.getReader() as ReadableStreamDefaultReader<Uint8Array> | undefined;

  if (!reader) {
    throw new Error('RSS response has no body');
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      const value = result.value;

      receivedBytes += value.byteLength;

      if (receivedBytes > MAX_FEED_BYTES) {
        throw new Error('RSS response exceeds maximum allowed size');
      }

      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  const result = new Uint8Array(receivedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(result);
}

export async function fetchRssArticles(feedUrl: string): Promise<CollectedArticle[]> {
  const xml = await downloadFeed(feedUrl);
  const feed = await parser.parseString(xml);

  const articles: CollectedArticle[] = [];

  for (const item of feed.items) {
    const title = cleanText(item.title);
    const url = item.link ? normalizeUrl(item.link, feedUrl) : null;

    const dateValue = item.isoDate ?? item.pubDate;
    const publishedAt = dateValue ? new Date(dateValue) : null;

    if (!title || !url || !publishedAt || Number.isNaN(publishedAt.getTime())) {
      continue;
    }

    articles.push({
      title,
      url,
      description: cleanText(item.contentSnippet ?? item.content),
      publishedAt,
    });
  }

  return articles;
}
