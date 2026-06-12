/**
 * Generates the static data cache in src/data/ from live Wikipedia /
 * Wikidata / Wikimedia Commons APIs.
 *
 *   node scripts/fetchWikiData.mjs
 *
 * Pipeline, per artist in scripts/curated.mjs:
 *   1. Wikipedia REST summary  -> biography extract, portrait, Wikidata QID
 *   2. Wikidata SPARQL         -> that artist's most famous works, ranked by
 *                                 number of Wikipedia language editions
 *                                 (sitelinks), with Commons image filename,
 *                                 inception year, medium, collection
 *   3. Wikipedia REST summary  -> per-artwork story (when an English article
 *                                 exists)
 *   4. Commons imageinfo API   -> exact server-generated thumbnail URLs,
 *                                 image dimensions, license + credit metadata
 *
 * Only images hosted on Wikimedia Commons (i.e. freely licensed /
 * public-domain) are kept. Works whose images are copyright-restricted are
 * still included as metadata-only entries so galleries can show a sourced
 * "image unavailable" placard instead of fabricating anything.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { periods, artists as allArtists } from './curated.mjs';

// Repair mode: `node scripts/fetchWikiData.mjs caravaggio bronzino`
// re-fetches only the named artist ids and merges them into the existing
// JSON instead of regenerating everything.
const onlyIds = process.argv.slice(2);
const artists = onlyIds.length ? allArtists.filter((a) => onlyIds.includes(a.id)) : allArtists;

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const UA = 'NocturneTimelineMuseum/1.0 (educational static-site project; contact: github)';
const WORKS_PER_ARTIST = 12; // stored; the gallery displays up to 8

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (res.status === 429 && attempt <= 6) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      await sleep(Math.max(retryAfter * 1000, 4000 * attempt));
      return getJson(url, attempt + 1);
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (attempt <= 3) {
      await sleep(1500 * attempt);
      return getJson(url, attempt + 1);
    }
    console.warn(`  ! network failure for ${url}: ${err.message}`);
    return null;
  }
}

function restSummary(title) {
  return getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
}

/** Bump a Wikipedia thumbnail URL to a larger width (falls back gracefully in the UI). */
function thumbAtWidth(thumbUrl, width) {
  if (!thumbUrl) return null;
  return thumbUrl.replace(/\/(\d+)px-/, `/${width}px-`);
}

// ---------------------------------------------------------------------------
// Wikidata SPARQL: famous works per artist
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

function worksQuery(qid) {
  return `
SELECT ?work ?workLabel ?sitelinks
       (SAMPLE(?img) AS ?image)
       (MIN(YEAR(?date)) AS ?year)
       (SAMPLE(?articleName) AS ?enwiki)
       (GROUP_CONCAT(DISTINCT ?typeLabel; separator="|") AS ?types)
       (GROUP_CONCAT(DISTINCT ?mediumLabel; separator=", ") AS ?medium)
       (SAMPLE(?collLabel) AS ?collection)
WHERE {
  ?work wdt:P170 wd:${qid} ; wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= 1)
  OPTIONAL { ?work wdt:P18 ?img }
  OPTIONAL { ?work wdt:P571 ?date }
  OPTIONAL { ?article schema:about ?work ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?articleName . }
  OPTIONAL { ?work wdt:P31 ?type . ?type rdfs:label ?typeLabel . FILTER(LANG(?typeLabel) = "en") }
  OPTIONAL { ?work wdt:P186 ?m . ?m rdfs:label ?mediumLabel . FILTER(LANG(?mediumLabel) = "en") }
  OPTIONAL { ?work wdt:P195 ?coll . ?coll rdfs:label ?collLabel . FILTER(LANG(?collLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?work ?workLabel ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT 30`;
}

async function fetchWorks(qid) {
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(worksQuery(qid))}`;
  const data = await getJson(url);
  if (!data?.results?.bindings) return [];
  return data.results.bindings.map((b) => ({
    qid: b.work?.value.split('/').pop() ?? null,
    title: b.workLabel?.value ?? 'Untitled',
    sitelinks: Number(b.sitelinks?.value ?? 0),
    commonsFile: b.image?.value ? decodeURIComponent(b.image.value.split('/Special:FilePath/').pop().replace(/\+/g, ' ')) : null,
    year: b.year?.value ? Number(b.year.value) : null,
    enwiki: b.enwiki?.value ?? null,
    types: b.types?.value ? b.types.value.split('|') : [],
    medium: b.medium?.value || null,
    collection: b.collection?.value || null,
  }));
}

// 2D-work preference: keep galleries about paintings, push sculpture /
// buildings / films down, drop obvious non-artworks.
const FLAT_TYPES = /painting|fresco|mural|triptych|diptych|polyptych|altarpiece|drawing|print|watercolor|pastel|collage|panel|icon|canvas|illustration|portrait|sketch|engraving|etching|lithograph|woodcut|silkscreen|screen print|series of paintings|art series/i;
const EXCLUDED_TYPES = /film|book|album|song|poem|literary|magazine|opera|musical|video game|typeface|manuscript|coat of arms|seal/i;

function rankWorks(works) {
  return works
    .filter((w) => w.title && !/^Q\d+$/.test(w.title)) // drop items with no English label
    .filter((w) => !w.types.length || !w.types.every((t) => EXCLUDED_TYPES.test(t)))
    .sort((a, b) => {
      const aFlat = a.types.some((t) => FLAT_TYPES.test(t)) ? 1 : 0;
      const bFlat = b.types.some((t) => FLAT_TYPES.test(t)) ? 1 : 0;
      if (aFlat !== bFlat) return bFlat - aFlat;
      return b.sitelinks - a.sitelinks;
    })
    .slice(0, WORKS_PER_ARTIST);
}

// ---------------------------------------------------------------------------
// Commons imageinfo: exact thumb URLs + license metadata, batched
// ---------------------------------------------------------------------------

function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : null;
}

async function fetchImageInfo(fileTitles) {
  const out = new Map();
  for (let i = 0; i < fileTitles.length; i += 40) {
    const batch = fileTitles.slice(i, i + 40);
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
      '&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=1600' +
      `&titles=${encodeURIComponent(batch.map((t) => `File:${t}`).join('|'))}`;
    const data = await getJson(url);
    const pages = data?.query?.pages ?? {};
    const normalized = new Map((data?.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      // Only Commons-hosted (freely licensed) media survives this pipeline.
      if (!/upload\.wikimedia\.org\/wikipedia\/commons\//.test(info.url)) continue;
      const meta = info.extmetadata ?? {};
      const large = info.thumburl ?? info.url;
      const key = normalized.get(page.title) ?? page.title;
      // Wikimedia only serves fixed thumb-width buckets (120/250/330/500/
      // 960/1280/1920…) — anything else returns 400. Gallery textures use
      // the 960 bucket; `large` keeps the API-returned bucket for inspect.
      out.set(key.replace(/^File:/, ''), {
        large,
        thumb: info.width > 960 ? large.replace(/\/\d+px-/, '/960px-') : large,
        width: info.width,
        height: info.height,
        filePage: info.descriptionurl,
        license: stripHtml(meta.LicenseShortName?.value) ?? 'See file page',
        credit: stripHtml(meta.Artist?.value),
      });
    }
    await sleep(250);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Fetching data for ${artists.length} artists…`);
  const artistsOut = [];
  const artworksOut = [];

  for (const artist of artists) {
    process.stdout.write(`- ${artist.name} `);
    const summary = await restSummary(artist.wikiTitle);
    if (!summary?.extract) {
      console.warn(`\n  ! no Wikipedia summary for ${artist.wikiTitle}, keeping curated fields only`);
    }
    const qid = summary?.wikibase_item ?? null;
    const thumb = summary?.thumbnail?.source ?? null;

    artistsOut.push({
      ...artist,
      qid,
      description: summary?.description ?? null,
      bio: summary?.extract ?? null,
      portrait: thumb
        ? { src: thumbAtWidth(thumb, 500), fallback: thumb }
        : null,
      wikiUrl: summary?.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(artist.wikiTitle)}`,
      attribution: 'Text adapted from Wikipedia, CC BY-SA 4.0',
    });

    if (!qid) {
      console.log('(no QID, skipping works)');
      continue;
    }

    await sleep(300);
    const ranked = rankWorks(await fetchWorks(qid));

    // Per-artwork story from the English Wikipedia article, when one exists.
    for (const w of ranked) {
      if (!w.enwiki) continue;
      const s = await restSummary(w.enwiki);
      if (s?.extract) {
        w.story = s.extract;
        w.wikiUrl = s.content_urls?.desktop?.page ?? null;
      }
      await sleep(120);
    }

    const imageInfo = await fetchImageInfo(ranked.filter((w) => w.commonsFile).map((w) => w.commonsFile));

    let withImage = 0;
    for (const w of ranked) {
      const img = w.commonsFile ? imageInfo.get(w.commonsFile) ?? null : null;
      if (img) withImage++;
      artworksOut.push({
        artistId: artist.id,
        qid: w.qid,
        title: w.title,
        year: w.year,
        medium: w.medium,
        collection: w.collection,
        sitelinks: w.sitelinks,
        story: w.story ?? null,
        wikiUrl: w.wikiUrl ?? null,
        wikidataUrl: w.qid ? `https://www.wikidata.org/wiki/${w.qid}` : null,
        image: img,
      });
    }
    console.log(`→ ${ranked.length} works, ${withImage} with free images`);
    await sleep(400);
  }

  const periodsOut = periods.map((p) => ({
    ...p,
    wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wikiTitle.replace(/ /g, '_'))}`,
  }));

  mkdirSync(OUT_DIR, { recursive: true });

  let finalArtists = artistsOut;
  let finalArtworks = artworksOut;
  if (onlyIds.length) {
    const readJson = (name) => {
      const p = join(OUT_DIR, name);
      return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
    };
    const keepArtists = readJson('artists.json').filter((a) => !onlyIds.includes(a.id));
    const keepWorks = readJson('artworks.json').filter((w) => !onlyIds.includes(w.artistId));
    // Preserve curated ordering for artists.
    const merged = new Map(keepArtists.concat(artistsOut).map((a) => [a.id, a]));
    finalArtists = allArtists.map((a) => merged.get(a.id)).filter(Boolean);
    finalArtworks = keepWorks.concat(artworksOut);
    console.log(`\nMerged repair for: ${onlyIds.join(', ')}`);
  }

  writeFileSync(join(OUT_DIR, 'periods.json'), JSON.stringify(periodsOut, null, 2));
  writeFileSync(join(OUT_DIR, 'artists.json'), JSON.stringify(finalArtists, null, 2));
  writeFileSync(join(OUT_DIR, 'artworks.json'), JSON.stringify(finalArtworks, null, 2));

  const totalImages = artworksOut.filter((a) => a.image).length;
  console.log(`\nDone. ${artistsOut.length} artists, ${artworksOut.length} works (${totalImages} with Commons images).`);
  console.log(`Wrote ${OUT_DIR}\\{periods,artists,artworks}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
