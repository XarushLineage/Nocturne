import type { Artist, Period } from '../types';

/**
 * Constellation layout.
 *
 * World space: 1 unit = 1 year on x. y uses the same scale so zooming
 * preserves the map's proportions. Periods sit on hand-tuned "lanes"
 * (see scripts/curated.mjs); artists scatter deterministically around
 * their period's star, pulled toward their own mid-career year so the
 * cluster still reads chronologically.
 */

export interface PeriodNode {
  kind: 'period';
  period: Period;
  x: number;
  y: number;
}

export interface ArtistNode {
  kind: 'artist';
  artist: Artist;
  periodId: string;
  x: number;
  y: number;
  /** stable per-node phase for twinkle animation */
  phase: number;
}

export interface Layout {
  periodNodes: PeriodNode[];
  artistNodes: ArtistNode[];
  /** chronological spine between period stars */
  spine: Array<[PeriodNode, PeriodNode]>;
  /** period star -> artist star constellation lines */
  links: Array<[PeriodNode, ArtistNode]>;
  minYear: number;
  maxYear: number;
}

/** Deterministic [0,1) hash so the sky looks identical on every visit. */
export function hash01(str: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function buildLayout(periods: Period[], artists: Artist[]): Layout {
  const sorted = [...periods].sort((a, b) => a.start - b.start);
  const periodNodes: PeriodNode[] = sorted.map((p) => ({
    kind: 'period',
    period: p,
    x: (p.start + p.end) / 2,
    y: p.lane,
  }));
  const byId = new Map(periodNodes.map((n) => [n.period.id, n]));

  const grouped = new Map<string, Artist[]>();
  for (const a of artists) {
    const list = grouped.get(a.periodId) ?? [];
    list.push(a);
    grouped.set(a.periodId, list);
  }

  const artistNodes: ArtistNode[] = [];
  const links: Layout['links'] = [];

  for (const [periodId, group] of grouped) {
    const pNode = byId.get(periodId);
    if (!pNode) continue;
    const p = pNode.period;
    group.forEach((artist, i) => {
      // Chronological anchor: mid-career, clamped near the period's span.
      const mid = artist.died ? (artist.born + artist.died) / 2 : artist.born + 40;
      const chronX = Math.min(Math.max(mid, p.start - 12), p.end + 12);
      // Deterministic scatter around the period star, alternating above/below.
      const r1 = hash01(artist.id, 1);
      const r2 = hash01(artist.id, 2);
      const side = i % 2 === 0 ? -1 : 1;
      const radius = 11 + r1 * 17;
      const dy = side * (7 + r2 * radius);
      const dx = (r1 - 0.5) * 26;
      const node: ArtistNode = {
        kind: 'artist',
        artist,
        periodId,
        x: chronX * 0.62 + (pNode.x + dx) * 0.38,
        y: pNode.y + dy,
        phase: r2 * Math.PI * 2,
      };
      artistNodes.push(node);
      links.push([pNode, node]);
    });
  }

  const spine: Layout['spine'] = [];
  for (let i = 0; i < periodNodes.length - 1; i++) {
    spine.push([periodNodes[i], periodNodes[i + 1]]);
  }

  return {
    periodNodes,
    artistNodes,
    spine,
    links,
    minYear: sorted.length ? sorted[0].start - 60 : 1150,
    maxYear: sorted.length ? sorted[sorted.length - 1].end + 40 : 2050,
  };
}

/** Smooth ease used for camera flights. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
