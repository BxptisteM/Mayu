import { z } from 'zod';

const repositorySchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string(),
  html_url: z.url(),
  description: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  language: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  pushed_at: z.iso.datetime({ offset: true }),
  archived: z.boolean(),
  fork: z.boolean(),
});

const searchResponseSchema = z.object({
  items: z.array(repositorySchema),
});

export interface GitHubRepository {
  id: number;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  createdAt: Date;
  pushedAt: Date;
}

export async function fetchTrendingRepositories(now = new Date()): Promise<GitHubRepository[]> {
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);

  const url = new URL('https://api.github.com/search/repositories');

  url.searchParams.set('q', `created:>=${since} stars:>=10 fork:false archived:false`);
  url.searchParams.set('sort', 'stars');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', '10');

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Mayu/1.0',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub repository search failed: HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const parsed = searchResponseSchema.parse(payload);

  return parsed.items
    .filter((repository) => !repository.archived && !repository.fork)
    .map((repository) => ({
      id: repository.id,
      fullName: repository.full_name,
      url: repository.html_url,
      description: repository.description,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      language: repository.language,
      createdAt: new Date(repository.created_at),
      pushedAt: new Date(repository.pushed_at),
    }));
}
