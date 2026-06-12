import { useCallback, useMemo, useRef, useState } from 'react';
import type { Artist, Artwork, Period } from './types';
import TimelineView, { type TimelineHandle } from './components/TimelineView';
import FilterMenu from './components/FilterMenu';
import ArtistCard from './components/ArtistCard';
import PeriodCard from './components/PeriodCard';
import MuseumGallery from './components/MuseumGallery';
import PaintingInspectView from './components/PaintingInspectView';
import ZoomTransition, { type VeilPhase } from './components/ZoomTransition';
import periodsJson from './data/periods.json';
import artistsJson from './data/artists.json';

const PERIODS = periodsJson as unknown as Period[];
const ARTISTS = artistsJson as unknown as Artist[];

/**
 * App shell + state machine.
 *
 *   timeline ──(zoom-into-star veil)──▶ gallery ──(fade veil)──▶ timeline
 *
 * artworks.json (the heavy file: ~900 works with stories) is code-split and
 * loaded on demand the first time an artist card opens — the constellation
 * itself only needs periods + artists.
 */
export default function App() {
  const timelineRef = useRef<TimelineHandle>(null);

  const [mode, setMode] = useState<'timeline' | 'gallery'>('timeline');
  const [cardArtistId, setCardArtistId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [galleryArtist, setGalleryArtist] = useState<Artist | null>(null);
  const [galleryWorks, setGalleryWorks] = useState<Artwork[]>([]);
  const [inspect, setInspect] = useState<Artwork | null>(null);
  const [veil, setVeil] = useState<VeilPhase>(null);
  const [veilOrigin, setVeilOrigin] = useState<{ x: number; y: number } | null>(null);
  const [veilLabel, setVeilLabel] = useState<string>('');

  // Lazy artwork cache (bumps a version so cards re-render once it lands).
  const artworksRef = useRef<Artwork[] | null>(null);
  const [artworksVersion, setArtworksVersion] = useState(0);
  const ensureArtworks = useCallback(async (): Promise<Artwork[]> => {
    if (!artworksRef.current) {
      const mod = await import('./data/artworks.json');
      artworksRef.current = mod.default as unknown as Artwork[];
      setArtworksVersion((v) => v + 1);
    }
    return artworksRef.current;
  }, []);

  /** All of an artist's works, freely-imaged ones first (display order). */
  const worksFor = useCallback((artistId: string): Artwork[] => {
    const all = artworksRef.current ?? [];
    const mine = all.filter((w) => w.artistId === artistId);
    return [...mine.filter((w) => w.image), ...mine.filter((w) => !w.image)];
  }, []);

  const selectArtist = useCallback(
    (id: string | null) => {
      setCardArtistId(id);
      if (id) {
        void ensureArtworks();
        timelineRef.current?.flyToArtist(id);
      }
    },
    [ensureArtworks],
  );

  const selectPeriod = useCallback((id: string | null) => {
    setPeriodFilter(id);
    setCardArtistId(null);
    if (id) timelineRef.current?.flyToPeriod(id);
    else timelineRef.current?.flyToOverview();
  }, []);

  const enterGallery = useCallback(
    async (artistId: string) => {
      const artist = ARTISTS.find((a) => a.id === artistId);
      if (!artist) return;
      await ensureArtworks();
      const works = worksFor(artistId);
      setCardArtistId(null);
      // Dive the camera into the star while the glow veil blooms from it.
      const origin = timelineRef.current?.diveIntoArtist(artistId) ?? null;
      setVeilOrigin(origin);
      setVeilLabel(artist.name);
      setVeil('enter');
      window.setTimeout(() => {
        setGalleryArtist(artist);
        setGalleryWorks(works);
        setMode('gallery');
        setVeil('hold');
        window.setTimeout(() => {
          setVeil('exit');
          window.setTimeout(() => setVeil(null), 1100);
        }, 650);
      }, 1180);
    },
    [ensureArtworks, worksFor],
  );

  const returnToTimeline = useCallback(() => {
    const artistId = galleryArtist?.id ?? null;
    setInspect(null);
    setVeil('fade');
    window.setTimeout(() => {
      setMode('timeline');
      setGalleryArtist(null);
      setVeil('exit');
      window.setTimeout(() => setVeil(null), 1100);
      // After the timeline remounts, ease the camera back out of the star.
      window.setTimeout(() => {
        if (artistId) timelineRef.current?.emergeFromArtist(artistId);
      }, 60);
    }, 440);
  }, [galleryArtist]);

  const closeInspect = useCallback(() => {
    setInspect(null);
    // Lets the gallery resume player movement.
    window.dispatchEvent(new Event('nocturne:inspect-closed'));
  }, []);

  const cardArtist = useMemo(
    () => (cardArtistId ? ARTISTS.find((a) => a.id === cardArtistId) ?? null : null),
    [cardArtistId],
  );
  const cardPeriod = useMemo(
    () => (cardArtist ? PERIODS.find((p) => p.id === cardArtist.periodId) ?? null : null),
    [cardArtist],
  );
  // artworksVersion dependency: re-derive once the lazy chunk arrives.
  const cardWorks = useMemo(
    () => (cardArtistId ? worksFor(cardArtistId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardArtistId, worksFor, artworksVersion],
  );

  // The kiosk can open from a gallery or straight from an artist card.
  const inspectArtistName = useMemo(
    () => (inspect ? ARTISTS.find((a) => a.id === inspect.artistId)?.name ?? '' : ''),
    [inspect],
  );

  const focusedPeriod = useMemo(
    () => (periodFilter ? PERIODS.find((p) => p.id === periodFilter) ?? null : null),
    [periodFilter],
  );

  return (
    <div className="app-root">
      {mode === 'timeline' && (
        <>
          <TimelineView
            ref={timelineRef}
            periods={PERIODS}
            artists={ARTISTS}
            selectedPeriodId={periodFilter}
            selectedArtistId={cardArtistId}
            onSelectArtist={selectArtist}
            onSelectPeriod={selectPeriod}
          />
          <div className="masthead">
            <h1>NOCTURNE</h1>
            <p>A timeline museum of art history</p>
          </div>
          <FilterMenu
            periods={PERIODS}
            artists={ARTISTS}
            selectedPeriodId={periodFilter}
            onSelectPeriod={selectPeriod}
            onSelectArtist={selectArtist}
          />
          <div className="hint-bar">Drag to wander · Scroll to zoom · Click a star</div>
          <PeriodCard
            period={cardArtistId ? null : focusedPeriod}
            artists={ARTISTS}
            onClose={() => selectPeriod(null)}
            onSelectArtist={selectArtist}
          />
          <ArtistCard
            artist={cardArtist}
            period={cardPeriod}
            works={cardWorks}
            onClose={() => setCardArtistId(null)}
            onEnterGallery={(id) => void enterGallery(id)}
            onFocusPeriod={selectPeriod}
            onInspectWork={setInspect}
          />
        </>
      )}

      {mode === 'gallery' && galleryArtist && (
        <MuseumGallery
          artist={galleryArtist}
          works={galleryWorks}
          onInspect={setInspect}
          onReturn={returnToTimeline}
        />
      )}

      {inspect && (
        <PaintingInspectView artwork={inspect} artistName={inspectArtistName} onClose={closeInspect} />
      )}

      <ZoomTransition phase={veil} origin={veilOrigin} label={veilLabel} />
    </div>
  );
}
