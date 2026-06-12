import { useEffect, useMemo, useState } from 'react';
import type { Artist, Artwork, Period } from '../types';
import { thumbAtWidth } from '../utils/imageHelpers';
import { fetchWikiSummary } from '../utils/wiki';

/**
 * Museum-placard side panel for a selected artist. Slides in from the
 * right over a dimming scrim; the timeline stays visible behind it.
 * All facts come from the static Wikipedia/Wikidata cache; if a field is
 * missing we say so rather than inventing anything.
 */

interface Props {
  artist: Artist | null;
  period: Period | null;
  /** The artist's works, already sorted (imaged works first). */
  works: Artwork[];
  onClose(): void;
  onEnterGallery(artistId: string): void;
  onFocusPeriod(periodId: string): void;
  /** Opens the same kiosk inspect view used inside the 3D gallery. */
  onInspectWork(artwork: Artwork): void;
}

export default function ArtistCard({ artist, period, works, onClose, onEnterGallery, onFocusPeriod, onInspectWork }: Props) {
  const [portraitLoaded, setPortraitLoaded] = useState(false);
  const [portraitSrc, setPortraitSrc] = useState<string | null>(null);
  const [liveBio, setLiveBio] = useState<string | null>(null);

  // Keep the last artist rendered during the slide-out animation.
  const [lastArtist, setLastArtist] = useState<Artist | null>(null);
  useEffect(() => {
    if (artist) {
      setLastArtist(artist);
      setPortraitLoaded(false);
      setPortraitSrc(artist.portrait?.src ?? null);
      setLiveBio(null);
      // Graceful fallback: if the bundled cache is missing a biography,
      // try a live (localStorage-cached) Wikipedia lookup.
      if (!artist.bio) {
        fetchWikiSummary(artist.wikiTitle).then((s) => {
          if (s?.extract) setLiveBio(s.extract);
        });
      }
    }
  }, [artist]);

  const a = artist ?? lastArtist;
  const visible = artist !== null;

  const bio = a?.bio ?? liveBio;
  const bioShort = useMemo(() => {
    if (!bio) return null;
    if (bio.length <= 620) return bio;
    const cut = bio.slice(0, 620);
    return `${cut.slice(0, Math.max(cut.lastIndexOf('. ') + 1, 400))} …`;
  }, [bio]);

  // Mirror of the gallery's hanging plan: the same works, same order.
  const galleryWorks = works.slice(0, 8);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      // When the inspect kiosk is open above the card, Escape belongs to it.
      if (e.key === 'Escape' && !document.querySelector('.inspect-overlay')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  return (
    <>
      <div className={`artist-card-scrim ${visible ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`artist-card ${visible ? 'visible' : ''}`} aria-hidden={!visible}>
        {a && (
          <>
            <button type="button" className="card-close" onClick={onClose} aria-label="Close artist card">✕</button>
            <div className="card-scroll">
              <div className="card-portrait">
                {portraitSrc ? (
                  <img
                    src={portraitSrc}
                    alt={`Portrait of ${a.name}`}
                    crossOrigin="anonymous"
                    className={portraitLoaded ? 'loaded' : ''}
                    onLoad={() => setPortraitLoaded(true)}
                    onError={() => {
                      // 600px thumb may not exist for small originals — fall back.
                      if (a.portrait && portraitSrc !== a.portrait.fallback) {
                        setPortraitSrc(a.portrait.fallback);
                      } else {
                        setPortraitSrc(null);
                      }
                    }}
                  />
                ) : (
                  <div className="portrait-missing">✦</div>
                )}
                <div className="portrait-fade" />
              </div>

              <div className="card-body">
                {period && (
                  <button type="button" className="card-period-chip" onClick={() => onFocusPeriod(period.id)}>
                    {period.name}
                  </button>
                )}
                <h2 className="card-name">{a.name}</h2>
                <div className="card-dates">
                  {a.born} — {a.died ?? 'present'}
                </div>
                {a.description && <div className="card-desc">{a.description}</div>}

                <div className="card-rule" />
                {bioShort ? (
                  <p className="card-bio">{bioShort}</p>
                ) : (
                  <p className="card-unavailable">Biography unavailable — see the Wikipedia article below.</p>
                )}

                <div className="card-rule" />
                <div className="card-section-label">Why they matter</div>
                <p className="card-sig">{a.significance}</p>

                <div className="card-rule" />
                <div className="card-section-label">In the gallery · click a work to inspect</div>
                {galleryWorks.length > 0 ? (
                  <div className="card-works">
                    {galleryWorks.map((work) => (
                      <button
                        key={`${work.qid}-${work.title}`}
                        type="button"
                        className="card-work"
                        onClick={() => onInspectWork(work)}
                      >
                        <div className="work-thumb">
                          {work.image ? (
                            <img
                              src={thumbAtWidth(work.image.thumb, 120)}
                              alt={work.title}
                              loading="lazy"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <span className="no-img">✦</span>
                          )}
                        </div>
                        <div className="work-meta">
                          <div className="work-title">{work.title}</div>
                          <div className="work-year">{work.year ?? 'date unknown'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="card-unavailable">No verified works available from Wikimedia sources.</p>
                )}

                <button type="button" className="card-enter" onClick={() => onEnterGallery(a.id)}>
                  Enter Gallery
                </button>

                <div className="card-source">
                  {a.attribution} ·{' '}
                  <a href={a.wikiUrl} target="_blank" rel="noopener noreferrer">
                    Wikipedia: {a.name}
                  </a>
                  {a.qid && (
                    <>
                      {' · '}
                      <a href={`https://www.wikidata.org/wiki/${a.qid}`} target="_blank" rel="noopener noreferrer">
                        Wikidata
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
