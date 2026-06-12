/**
 * Sanity report over src/data/*.json:
 * flags artists with missing bios/QIDs/portraits, zero works, or zero free
 * images where images are clearly expected (artist born before 1880 — their
 * paintings are public domain, so an empty result means a fetch hiccup,
 * not a rights restriction). Exit code 1 if anything needs a repair pass:
 *
 *   node scripts/fetchWikiData.mjs <flagged ids...>
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const artists = JSON.parse(readFileSync(join(DIR, 'artists.json'), 'utf8'));
const artworks = JSON.parse(readFileSync(join(DIR, 'artworks.json'), 'utf8'));
const periods = JSON.parse(readFileSync(join(DIR, 'periods.json'), 'utf8'));

const byArtist = new Map();
for (const w of artworks) {
  const s = byArtist.get(w.artistId) ?? { works: 0, imaged: 0, stories: 0 };
  s.works++;
  if (w.image) s.imaged++;
  if (w.story) s.stories++;
  byArtist.set(w.artistId, s);
}

const repair = new Set();
console.log(`periods: ${periods.length} · artists: ${artists.length} · works: ${artworks.length} (${artworks.filter((w) => w.image).length} imaged)\n`);
for (const a of artists) {
  const s = byArtist.get(a.id) ?? { works: 0, imaged: 0, stories: 0 };
  const flags = [];
  if (!a.qid) flags.push('NO-QID');
  if (!a.bio) flags.push('NO-BIO');
  if (!a.portrait) flags.push('no-portrait');
  if (s.works === 0) flags.push('NO-WORKS');
  if (s.imaged === 0 && a.born < 1880) flags.push('NO-IMAGES(PD-era!)');
  if (flags.some((f) => /^[A-Z]/.test(f.replace(/\(.*/, '')))) {
    if (flags.some((f) => f.startsWith('NO'))) repair.add(a.id);
  }
  const line = `${a.name.padEnd(32)} works:${String(s.works).padStart(2)} imaged:${String(s.imaged).padStart(2)} stories:${String(s.stories).padStart(2)} ${flags.join(' ')}`;
  console.log(line);
}

if (repair.size) {
  console.log(`\nRepair needed → node scripts/fetchWikiData.mjs ${[...repair].join(' ')}`);
  process.exit(1);
}
console.log('\nAll good.');
