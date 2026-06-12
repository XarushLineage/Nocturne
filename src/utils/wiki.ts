/**
 * Runtime Wikipedia fallback.
 *
 * The app ships with a static data cache (src/data/*.json) generated from
 * Wikipedia / Wikidata / Wikimedia Commons, so normally no runtime API
 * calls are needed. This helper exists for graceful degradation: if a
 * bundled record is missing its biography or portrait (e.g. the cache was
 * regenerated while an article was unavailable), the UI can attempt a live
 * fetch, memoized in localStorage. All failures resolve to null — callers
 * render a tasteful "information unavailable" note instead.
 */

export interface WikiSummary {
  extract: string | null;
  description: string | null;
  thumbnail: string | null;
  pageUrl: string | null;
}

const CACHE_PREFIX = 'nocturne.wiki.v1:';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function readCache(key: string): WikiSummary | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (Date.now() - t > CACHE_TTL_MS) return null;
    return v;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: WikiSummary): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* storage full or blocked — caching is best-effort */
  }
}

export async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const cached = readCache(title);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      { headers: { accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const summary: WikiSummary = {
      extract: data.extract ?? null,
      description: data.description ?? null,
      thumbnail: data.thumbnail?.source ?? null,
      pageUrl: data.content_urls?.desktop?.page ?? null,
    };
    writeCache(title, summary);
    return summary;
  } catch {
    return null;
  }
}
