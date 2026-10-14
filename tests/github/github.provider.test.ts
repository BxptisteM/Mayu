import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTrendingRepositories } from '../../src/github/github.provider.js';
const fetchMock = vi.fn<typeof fetch>();
const repository = {
  id: 1,
  full_name: 'owner/project',
  html_url: 'https://github.com/owner/project',
  description: null,
  stargazers_count: 100,
  forks_count: 10,
  language: null,
  created_at: '2026-10-13T12:00:00Z',
  pushed_at: '2026-10-14T12:00:00Z',
  archived: false,
  fork: false,
};
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('GITHUB_TOKEN', '');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('GitHub discovery API', () => {
  it('normalizes repository metadata and sends a bounded search query', async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [repository] }));
    expect(await fetchTrendingRepositories(new Date('2026-10-14T12:00:00Z'))).toEqual([
      {
        id: 1,
        fullName: 'owner/project',
        url: repository.html_url,
        description: null,
        stars: 100,
        forks: 10,
        language: null,
        createdAt: new Date(repository.created_at),
        pushedAt: new Date(repository.pushed_at),
      },
    ]);
    const request = fetchMock.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(URL);
    if (!(request instanceof URL)) throw new Error('Expected search URL');
    expect(request.searchParams.get('per_page')).toBe('10');
    expect(request.searchParams.get('q')).toBe(
      'created:>=2026-10-07 stars:>=10 fork:false archived:false',
    );
  });
  it('filters archived repositories and forks', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        items: [
          { ...repository, archived: true },
          { ...repository, fork: true },
        ],
      }),
    );
    expect(await fetchTrendingRepositories()).toEqual([]);
  });
  it('accepts empty search results', async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [] }));
    expect(await fetchTrendingRepositories()).toEqual([]);
  });
  it.each([
    { items: [{}] },
    { items: [{ ...repository, stargazers_count: -1 }] },
    { items: [{ ...repository, created_at: 'invalid' }] },
    {},
  ])('rejects invalid API metadata %j', async (payload) => {
    fetchMock.mockResolvedValue(Response.json(payload));
    await expect(fetchTrendingRepositories()).rejects.toThrow();
  });
  it.each([403, 429, 500])('reports HTTP %s failures', async (status) => {
    fetchMock.mockResolvedValue(new Response('', { status }));
    await expect(fetchTrendingRepositories()).rejects.toThrow(`HTTP ${status}`);
  });
  it('propagates network failures', async () => {
    fetchMock.mockRejectedValue(new Error('Network unavailable'));
    await expect(fetchTrendingRepositories()).rejects.toThrow('Network unavailable');
  });
});
