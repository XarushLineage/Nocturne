import { useEffect, useState } from 'react';
import type { Artwork } from '../types';

/**
 * Museum-kiosk inspect overlay: large image, sourced story, metadata,
 * and full attribution. Facts come exclusively from the Wikipedia /
 * Wikidata / Commons cache; absent fields get an honest note.
 */

interface Props {
  artwork: Artwork;
  artistName: string;
  onClose(): void;
}

/** "oil paint, canvas" (Wikidata P186 labels) → "Oil on canvas". */
function formatMedium(medium: string | null): string | null {
  if (!medium) return null;
  const parts = medium.split(',').map((s) => s.trim()).filter(Boolean);
  const paint = parts.find((p) => /paint|pastel|tempera|ink|gouache|watercolor|charcoal|graphite/i.test(p));
  const support = parts.find((p) => /canvas|panel|paper|wood|copper|board|cardboard|masonite|plaster/i.test(p));
  let label: string;
  if (paint && support) label = `${paint.replace(/ paint$/i, '')} on ${support}`;
  else label = parts.join(', ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function PaintingInspectView({ artwork, artistName, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 280);
  };

  useEffect(() => {
    // Belt-and-braces: a kiosk needs a visible cursor.
    if (document.pointerLockElement) document.exitPointerLock();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const medium = formatMedium(artwork.medium);

  return (
    <div className={`inspect-overlay ${closing ? 'closing' : ''}`} onClick={close}>
      <div className="inspect-frame" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="inspect-close" onClick={close} aria-label="Close inspect view">✕</button>

        <div className="inspect-image">
          {artwork.image ? (
            <>
              {!imgLoaded && <div className="img-loading">Retrieving the work…</div>}
              <img
                src={artwork.image.large}
                alt={`${artwork.title} by ${artistName}`}
                className={imgLoaded ? 'loaded' : ''}
                onLoad={() => setImgLoaded(true)}
              />
            </>
          ) : (
            <div className="img-missing">
              <span className="glyph">✦</span>
              <span>
                No freely licensed image of this work is available on Wikimedia Commons.
                The sourced details are shown here in its place.
              </span>
            </div>
          )}
        </div>

        <div className="inspect-panel">
          <div className="inspect-scroll">
            <div className="inspect-eyebrow">{artistName}</div>
            <h2 className="inspect-title">{artwork.title}</h2>
            <div className="inspect-meta">
              <span>{artwork.year ?? 'Date unknown'}</span>
              {medium && (
                <>
                  <span className="sep">·</span>
                  <span>{medium}</span>
                </>
              )}
              {artwork.collection && (
                <>
                  <span className="sep">·</span>
                  <span>{artwork.collection}</span>
                </>
              )}
            </div>

            <div className="inspect-rule" />

            {artwork.story ? (
              <p className="inspect-story">{artwork.story}</p>
            ) : (
              <p className="inspect-unavailable">
                No English Wikipedia article is available for this work, so no description is shown.
                The title, date, and attribution above come from Wikidata.
              </p>
            )}

            <div className="inspect-sources">
              Sources:{' '}
              {artwork.wikiUrl && (
                <>
                  <a href={artwork.wikiUrl} target="_blank" rel="noopener noreferrer">Wikipedia</a>
                  {' · '}
                </>
              )}
              {artwork.wikidataUrl && (
                <>
                  <a href={artwork.wikidataUrl} target="_blank" rel="noopener noreferrer">Wikidata</a>
                  {' · '}
                </>
              )}
              {artwork.image && (
                <a href={artwork.image.filePage} target="_blank" rel="noopener noreferrer">
                  Wikimedia Commons
                </a>
              )}
              {artwork.image && (
                <div>
                  Image: {artwork.image.license}
                  {artwork.image.credit ? ` · ${artwork.image.credit.slice(0, 80)}` : ''} · via Wikimedia Commons
                </div>
              )}
              <div>Text from Wikipedia, CC BY-SA 4.0.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
