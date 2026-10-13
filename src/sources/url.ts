const TRACKING_PARAMETERS = new Set(['fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref_src']);

export function normalizeUrl(value: string, baseUrl?: string): string | null {
  try {
    const url = new URL(value, baseUrl);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    url.hash = '';
    url.hostname = url.hostname.toLowerCase();

    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMETERS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();

    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  } catch {
    return null;
  }
}
