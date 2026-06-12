import { useMemo, useState } from 'react';
import type { Artist, Period } from '../types';

/**
 * Dark-glass filter panel: browse by period or search artists.
 * Selecting a period dims the rest of the sky and flies the camera to its
 * cluster; selecting an artist flies to their star and opens the placard.
 */

interface Props {
  periods: Period[];
  artists: Artist[];
  selectedPeriodId: string | null;
  onSelectPeriod(id: string | null): void;
  onSelectArtist(id: string): void;
}

export default function FilterMenu({ periods, artists, selectedPeriodId, onSelectPeriod, onSelectArtist }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'periods' | 'artists'>('periods');
  const [query, setQuery] = useState('');

  const periodName = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId)?.name ?? null,
    [periods, selectedPeriodId],
  );

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? artists.filter((a) => a.name.toLowerCase().includes(q)) : artists;
    return [...list].sort((a, b) => a.born - b.born);
  }, [artists, query]);

  const periodById = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);

  return (
    <div className="filter-menu">
      <button
        type="button"
        className={`filter-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="diamond">✦</span>
        Explore
        {periodName && <span className="current">{periodName}</span>}
      </button>

      <div className={`filter-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="filter-tabs">
          <button type="button" className={tab === 'periods' ? 'active' : ''} onClick={() => setTab('periods')}>
            Periods
          </button>
          <button type="button" className={tab === 'artists' ? 'active' : ''} onClick={() => setTab('artists')}>
            Artists
          </button>
        </div>

        {tab === 'periods' ? (
          <div className="filter-list">
            <button
              type="button"
              className={`filter-item ${selectedPeriodId === null ? 'active' : ''}`}
              onClick={() => onSelectPeriod(null)}
            >
              <span className="star">✦</span> All periods
            </button>
            {periods.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`filter-item ${selectedPeriodId === p.id ? 'active' : ''}`}
                onClick={() => onSelectPeriod(p.id)}
              >
                <span className="star">✦</span>
                {p.name}
                <span className="years">{p.start}–{p.end}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="filter-list">
            <input
              type="text"
              className="filter-search"
              placeholder="Search artists…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {filteredArtists.length === 0 && <div className="filter-empty">No artists match.</div>}
            {filteredArtists.map((a) => (
              <button key={a.id} type="button" className="filter-item" onClick={() => onSelectArtist(a.id)}>
                <span className="star">·</span>
                {a.name}
                <span className="period-tag">{periodById.get(a.periodId)?.name ?? ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
