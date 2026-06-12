/**
 * The "zoom into the star" veil. While the timeline camera dives toward the
 * chosen artist's star, a glow blooms from the star's screen position and
 * swallows the viewport; the veil then holds black (with a loading line)
 * while the gallery mounts, and finally fades away.
 *
 * Phases: 'enter' (starburst → black) · 'fade' (plain fade to black)
 *         · 'hold' (black + loading line) · 'exit' (black → clear)
 */

export type VeilPhase = 'enter' | 'fade' | 'hold' | 'exit' | null;

interface Props {
  phase: VeilPhase;
  origin: { x: number; y: number } | null;
  label?: string;
}

export default function ZoomTransition({ phase, origin, label }: Props) {
  if (!phase) return null;
  return (
    <div className={`transition-veil ${phase}`}>
      {phase === 'enter' && origin && (
        <div className="star-burst" style={{ left: origin.x, top: origin.y }} />
      )}
      <div className="blackout" />
      {(phase === 'enter' || phase === 'hold') && (
        <>
          <div className="loading-line" />
          {label && <div className="loading-label">{label}</div>}
        </>
      )}
    </div>
  );
}
