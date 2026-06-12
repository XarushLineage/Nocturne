import { useEffect, useMemo, useState } from 'react';
import type { Artist, Period } from '../types';

/**
 * Compact placard shown while a period is in focus: sourced summary, date
 * range, and the period's artists (each click flies to that star and opens
 * the artist placard). Hidden automatically while an artist card is open.
 */

interface Props {
  /** null hides the card (the last period is kept for the fade-out). */
  period: Period | null;
  artists: Artist[];
  onClose(): void;
  onSelectArtist(id: string): void;
}

export default function PeriodCard({ period, artists, onClose, onSelectArtist }: Props) {
  const [lastPeriod, setLastPeriod] = useState<Period | null>(null);
  useEffect(() => {
    if (period) setLastPeriod(period);
  }, [period]);
  const p = period ?? lastPeriod;
  const visible = period !== null;

  const members = useMemo(
    () => (p ? artists.filter((a) => a.periodId === p.id).sort((a, b) => a.born - b.born) : []),
    [artists, p],
  );

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      // Inspect kiosk (if open) owns Escape; the artist card hides this
      // card entirely, so no conflict there.
      if (e.key === 'Escape' && !document.querySelector('.inspect-overlay')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  return (
    <aside className={`period-card ${visible ? 'visible' : ''}`} aria-hidden={!visible}>
      {p && (
        <>
          <button type="button" className="card-close" onClick={onClose} aria-label="Clear period focus">
            ✕
          </button>
          <div className="period-eyebrow">Period</div>
          <h3 className="period-name">{p.name}</h3>
          <div className="period-years">
            {p.start} — {p.end}
          </div>
          <p className="period-summary">{p.summary}</p>
          <div className="card-rule" />
          <div className="card-section-label">Artists of the period</div>
          <div className="period-artists">
            {members.map((a) => (
              <button key={a.id} type="button" className="filter-item" onClick={() => onSelectArtist(a.id)}>
                <span className="star">✦</span>
                {a.name}
                <span className="years">
                  {a.born}–{a.died ?? ''}
                </span>
              </button>
            ))}
          </div>
          <div className="card-source">
            Source:{' '}
            <a href={p.wikiUrl} target="_blank" rel="noopener noreferrer">
              Wikipedia: {p.wikiTitle}
            </a>
          </div>
        </>
      )}
    </aside>
  );
}
