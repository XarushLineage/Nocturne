import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { Artist, Period } from '../types';
import {
  buildLayout,
  easeInOutCubic,
  hash01,
  type ArtistNode,
  type PeriodNode,
} from '../utils/timelineLayout';
import { drawFlare, drawLink, drawRing, drawStar, periodPalette } from './TimelineNode';

/**
 * The constellation timeline: a zoomable, pannable 2D-canvas star map of
 * art history. Rendering happens in a requestAnimationFrame loop; React is
 * only involved for mounting and for prop changes (selection / filters).
 */

export interface TimelineHandle {
  flyToPeriod(id: string): void;
  /** Frames an artist left-of-center so the side placard doesn't cover it. */
  flyToArtist(id: string): void;
  /** Camera dive used by the enter-gallery transition; returns the star's screen position. */
  diveIntoArtist(id: string): { x: number; y: number } | null;
  /** Reverse of the dive: start deep inside the star and ease back out. */
  emergeFromArtist(id: string): void;
  flyToOverview(): void;
}

interface Props {
  periods: Period[];
  artists: Artist[];
  selectedPeriodId: string | null;
  selectedArtistId: string | null;
  onSelectArtist(id: string | null): void;
  onSelectPeriod(id: string | null): void;
}

interface Camera {
  x: number;
  y: number;
  s: number;
}

interface Flight {
  from: Camera;
  to: Camera;
  t0: number;
  ms: number;
}

interface Dust {
  x: number;
  y: number;
  r: number;
  a: number;
  phase: number;
  p: number; // parallax factor
}

const CARD_WIDTH = 440;

const TimelineView = forwardRef<TimelineHandle, Props>(function TimelineView(
  { periods, artists, selectedPeriodId, selectedArtistId, onSelectArtist, onSelectPeriod },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => buildLayout(periods, artists), [periods, artists]);

  // Mutable render state, owned by the RAF loop (never triggers re-render).
  const state = useRef({
    cam: { x: 0, y: 0, s: 1 } as Camera,
    target: { x: 0, y: 0, s: 1 } as Camera,
    flight: null as Flight | null,
    fitS: 1,
    w: 0,
    h: 0,
    hover: null as PeriodNode | ArtistNode | null,
    dragging: false,
    selectedPeriodId,
    selectedArtistId,
    dust: [] as Dust[],
  });

  // Keep latest selection visible to the render loop.
  state.current.selectedPeriodId = selectedPeriodId;
  state.current.selectedArtistId = selectedArtistId;

  const periodIndex = useMemo(() => {
    const m = new Map<string, number>();
    periods.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [periods]);

  const startFlight = (to: Partial<Camera>, ms = 1000) => {
    const st = state.current;
    st.flight = {
      from: { ...st.cam },
      to: { x: to.x ?? st.cam.x, y: to.y ?? st.cam.y, s: to.s ?? st.cam.s },
      t0: performance.now(),
      ms,
    };
    st.target = { ...st.flight.to };
  };

  const periodFrame = (node: PeriodNode): Camera => {
    const st = state.current;
    const p = node.period;
    const spanW = Math.max(p.end - p.start, 60) + 90;
    const s = Math.min(st.w / spanW, (st.h * 0.82) / 110);
    // Shift the cluster left of center so the period placard (right side)
    // doesn't cover it.
    return { x: node.x + 105 / s, y: node.y * 0.82, s };
  };

  useImperativeHandle(ref, () => ({
    flyToPeriod(id) {
      const node = layout.periodNodes.find((n) => n.period.id === id);
      if (node) startFlight(periodFrame(node), 1200);
    },
    flyToArtist(id) {
      const st = state.current;
      const node = layout.artistNodes.find((n) => n.artist.id === id);
      if (!node) return;
      const s = Math.max(st.fitS * 4.5, 3.5);
      // Anchor the star at the horizontal center of the area left of the card.
      const anchorX = Math.max(st.w - CARD_WIDTH, st.w * 0.5) / 2;
      startFlight({ x: node.x - (anchorX - st.w / 2) / s, y: node.y, s }, 1100);
    },
    diveIntoArtist(id) {
      const st = state.current;
      const node = layout.artistNodes.find((n) => n.artist.id === id);
      if (!node) return null;
      const sx = (node.x - st.cam.x) * st.cam.s + st.w / 2;
      const sy = (node.y - st.cam.y) * st.cam.s + st.h / 2;
      startFlight({ x: node.x, y: node.y, s: Math.max(st.cam.s * 14, 60) }, 1050);
      return { x: sx, y: sy };
    },
    emergeFromArtist(id) {
      const st = state.current;
      const node = layout.artistNodes.find((n) => n.artist.id === id);
      if (!node) return;
      st.cam = { x: node.x, y: node.y, s: 60 };
      st.target = { ...st.cam };
      const pNode = layout.periodNodes.find((p) => p.period.id === node.periodId);
      if (pNode) startFlight(periodFrame(pNode), 1600);
    },
    flyToOverview() {
      const st = state.current;
      startFlight({ x: (layout.minYear + layout.maxYear) / 2, y: 0, s: st.fitS }, 1100);
    },
  }), [layout]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const st = state.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let last = performance.now();
    const pointers = new Map<number, { x: number; y: number }>();
    let downPos: { x: number; y: number } | null = null;
    let moved = 0;
    let pinchDist = 0;

    // — setup —
    let camInitialized = false;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return; // container not laid out yet — wait for the observer
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w;
      st.h = h;
      const span = layout.maxYear - layout.minYear;
      st.fitS = w / span;
      if (!camInitialized) {
        camInitialized = true;
        st.cam = { x: (layout.minYear + layout.maxYear) / 2, y: 0, s: st.fitS };
        st.target = { ...st.cam };
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (!st.dust.length) {
      for (let i = 0; i < 300; i++) {
        const k = `dust${i}`;
        st.dust.push({
          x: hash01(k, 3),
          y: hash01(k, 4),
          r: 0.4 + hash01(k, 5) * 1.1,
          a: 0.05 + hash01(k, 6) * 0.3,
          phase: hash01(k, 7) * Math.PI * 2,
          p: i % 3 === 0 ? 0.5 : 0.22,
        });
      }
    }

    const clampS = (s: number) => Math.min(Math.max(s, st.fitS * 0.75), 60);

    const toScreen = (wx: number, wy: number): [number, number] => [
      (wx - st.cam.x) * st.cam.s + st.w / 2,
      (wy - st.cam.y) * st.cam.s + st.h / 2,
    ];

    // — visibility model —
    const relZoom = () => st.cam.s / st.fitS;
    const artistAlpha = (node: ArtistNode) => {
      const base = Math.min(Math.max((relZoom() - 1.25) / 1.6, 0.14), 1);
      const sel = st.selectedPeriodId;
      if (!sel) return base;
      return node.periodId === sel ? Math.max(base, 0.85) : base * 0.18;
    };
    const periodAlpha = (node: PeriodNode) => {
      const fade = Math.min(Math.max(1.25 - (relZoom() - 3.2) * 0.18, 0.35), 1);
      const sel = st.selectedPeriodId;
      if (!sel) return fade;
      return node.period.id === sel ? 1 : fade * 0.22;
    };

    // — hit testing —
    const hitTest = (mx: number, my: number): PeriodNode | ArtistNode | null => {
      let best: PeriodNode | ArtistNode | null = null;
      let bestD = Infinity;
      for (const node of layout.artistNodes) {
        if (artistAlpha(node) < 0.3) continue;
        const [sx, sy] = toScreen(node.x, node.y);
        const d = Math.hypot(mx - sx, my - sy);
        if (d < 16 && d < bestD) { best = node; bestD = d; }
      }
      if (best) return best;
      for (const node of layout.periodNodes) {
        const [sx, sy] = toScreen(node.x, node.y);
        const d = Math.hypot(mx - sx, my - sy);
        if (d < 26 && d < bestD) { best = node; bestD = d; }
      }
      return best;
    };

    // — input —
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      st.flight = null;
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.0016));
      const ns = clampS(st.target.s * factor);
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Keep the world point under the cursor stationary while zooming.
      const wx = st.target.x + (mx - st.w / 2) / st.target.s;
      const wy = st.target.y + (my - st.h / 2) / st.target.s;
      st.target.s = ns;
      st.target.x = wx - (mx - st.w / 2) / ns;
      st.target.y = wy - (my - st.h / 2) / ns;
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        downPos = { x: e.clientX, y: e.clientY };
        moved = 0;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) {
        // plain hover
        const rect = canvas.getBoundingClientRect();
        st.hover = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        canvas.classList.toggle('hovering', !!st.hover);
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved += Math.abs(dx) + Math.abs(dy);

      if (pointers.size === 2) {
        st.flight = null;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) {
          const ns = clampS(st.target.s * (d / pinchDist));
          st.target.s = ns;
          st.cam.s = ns;
        }
        pinchDist = d;
        return;
      }

      if (moved > 4) {
        st.flight = null;
        st.dragging = true;
        canvas.classList.add('dragging');
        st.cam.x -= dx / st.cam.s;
        st.cam.y -= dy / st.cam.s;
        st.target.x = st.cam.x;
        st.target.y = st.cam.y;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      canvas.classList.remove('dragging');
      const wasDrag = st.dragging && moved > 6;
      if (pointers.size === 0) st.dragging = false;
      if (wasDrag || !downPos) return;
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      if (!hit) {
        onSelectArtist(null);
      } else if (hit.kind === 'artist') {
        onSelectArtist(hit.artist.id);
      } else {
        onSelectPeriod(hit.period.id);
        startFlight(periodFrame(hit), 1200);
      }
      downPos = null;
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const pan = 90 / st.cam.s;
      if (e.key === 'ArrowLeft') st.target.x -= pan;
      else if (e.key === 'ArrowRight') st.target.x += pan;
      else if (e.key === 'ArrowUp') st.target.y -= pan;
      else if (e.key === 'ArrowDown') st.target.y += pan;
      else if (e.key === '+' || e.key === '=') st.target.s = clampS(st.target.s * 1.35);
      else if (e.key === '-') st.target.s = clampS(st.target.s / 1.35);
      else return;
      st.flight = null;
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKey);

    // QA hooks: camera state and node screen positions for the e2e suite.
    (window as unknown as Record<string, unknown>).__nocturneCam = () => ({ ...st.cam });
    (window as unknown as Record<string, unknown>).__nocturneArtistScreen = (id: string) => {
      const node = layout.artistNodes.find((n) => n.artist.id === id);
      if (!node) return null;
      const [x, y] = toScreen(node.x, node.y);
      return { x, y };
    };

    const periodNames = new Map(periods.map((p) => [p.id, p.name]));
    let tooltipFor: string | null = null;

    // — render loop —
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { w, h } = st;
      if (!w || !h) return;

      // camera integration
      if (st.flight) {
        const f = st.flight;
        const t = Math.min((now - f.t0) / f.ms, 1);
        const k = easeInOutCubic(t);
        // exponential interpolation on scale keeps the zoom speed perceptually even
        st.cam.s = f.from.s * Math.pow(f.to.s / f.from.s, k);
        st.cam.x = f.from.x + (f.to.x - f.from.x) * k;
        st.cam.y = f.from.y + (f.to.y - f.from.y) * k;
        if (t >= 1) st.flight = null;
      } else {
        const k = 1 - Math.exp(-dt * 7);
        st.cam.x += (st.target.x - st.cam.x) * k;
        st.cam.y += (st.target.y - st.cam.y) * k;
        st.cam.s += (st.target.s - st.cam.s) * k;
      }

      // — background —
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.75);
      bg.addColorStop(0, '#0b0d14');
      bg.addColorStop(1, '#06070b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // dust with parallax + twinkle
      const t = now / 1000;
      for (const d of st.dust) {
        let sx = (d.x * w * 1.6 - st.cam.x * st.cam.s * d.p) % (w * 1.6);
        if (sx < -20) sx += w * 1.6;
        let sy = (d.y * h * 1.4 - st.cam.y * st.cam.s * d.p * 0.7) % (h * 1.4);
        if (sy < -20) sy += h * 1.4;
        sx -= w * 0.3;
        sy -= h * 0.2;
        const tw = 0.65 + 0.35 * Math.sin(t * 0.8 + d.phase);
        ctx.fillStyle = `rgba(220,222,232,${d.a * tw})`;
        ctx.beginPath();
        ctx.arc(sx, sy, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // — chronological axis —
      const axisY = h - 78;
      ctx.strokeStyle = 'rgba(216,184,106,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, axisY);
      ctx.lineTo(w, axisY);
      ctx.stroke();
      const showDecades = relZoom() > 3.4;
      const step = showDecades ? 10 : 100;
      const startYear = Math.floor((st.cam.x - w / 2 / st.cam.s) / step) * step;
      const endYear = st.cam.x + w / 2 / st.cam.s;
      ctx.textAlign = 'center';
      for (let year = startYear; year <= endYear; year += step) {
        const [sx] = toScreen(year, 0);
        if (sx < -60 || sx > w + 60) continue;
        const century = year % 100 === 0;
        ctx.strokeStyle = century ? 'rgba(216,184,106,0.4)' : 'rgba(216,184,106,0.18)';
        ctx.beginPath();
        ctx.moveTo(sx, axisY - (century ? 7 : 4));
        ctx.lineTo(sx, axisY + (century ? 7 : 4));
        ctx.stroke();
        if (century) {
          // whisper-faint vertical gridline
          ctx.strokeStyle = 'rgba(216,184,106,0.035)';
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, axisY - 10);
          ctx.stroke();
          ctx.fillStyle = 'rgba(236,229,211,0.5)';
          ctx.font = '500 12px "Cormorant Garamond", Georgia, serif';
          ctx.fillText(String(year), sx, axisY + 24);
        } else if (showDecades && year % 50 === 0) {
          ctx.fillStyle = 'rgba(236,229,211,0.28)';
          ctx.font = '400 10px "Cormorant Garamond", Georgia, serif';
          ctx.fillText(String(year), sx, axisY + 20);
        }
      }

      // — constellation spine between periods —
      for (const [a, b] of layout.spine) {
        const [x1, y1] = toScreen(a.x, a.y);
        const [x2, y2] = toScreen(b.x, b.y);
        drawLink(ctx, x1, y1, x2, y2, 0.085 * Math.min(periodAlpha(a), periodAlpha(b)) * 1.2);
      }

      // — period→artist links —
      for (const [p, a] of layout.links) {
        const alpha = artistAlpha(a);
        if (alpha < 0.05) continue;
        const [x1, y1] = toScreen(p.x, p.y);
        const [x2, y2] = toScreen(a.x, a.y);
        drawLink(ctx, x1, y1, x2, y2, 0.16 * alpha, '200,200,210');
      }

      // — artist stars —
      const labelAlpha = Math.min(Math.max((relZoom() - 2.1) / 1.4, 0), 1);
      for (const node of layout.artistNodes) {
        const alpha = artistAlpha(node);
        if (alpha < 0.03) continue;
        const [sx, sy] = toScreen(node.x, node.y);
        if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
        const pal = periodPalette(periodIndex.get(node.periodId) ?? 0);
        const tw = 0.8 + 0.2 * Math.sin(t * 1.3 + node.phase);
        const isSel = st.selectedArtistId === node.artist.id;
        const isHover = st.hover?.kind === 'artist' && st.hover.artist.id === node.artist.id;
        const r = (isSel || isHover ? 3.4 : 2.3) * Math.min(1, 0.55 + relZoom() * 0.16);
        drawStar(ctx, sx, sy, r, pal, alpha * (isSel ? 1 : 0.92), tw);
        if (isHover || isSel) {
          drawRing(ctx, sx, sy, 9 + Math.sin(t * 3) * 1.6, 0.55);
        }
        const la = isHover || isSel ? 0.95 : labelAlpha * alpha;
        if (la > 0.04) {
          ctx.font = '300 10.5px Inter, system-ui, sans-serif';
          ctx.fillStyle = `rgba(236,229,211,${0.78 * la})`;
          ctx.textAlign = 'center';
          try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '1.5px'; } catch { /* older browsers */ }
          // Stagger labels above/below the star (stable per node) so
          // neighbouring artists in dense clusters don't overprint.
          const labelY = node.phase > Math.PI ? sy + 22 : sy - 14;
          ctx.fillText(node.artist.name.toUpperCase(), sx, labelY);
          try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'; } catch { /* noop */ }
        }
      }

      // — period stars —
      for (const node of layout.periodNodes) {
        const alpha = periodAlpha(node);
        const [sx, sy] = toScreen(node.x, node.y);
        if (sx < -200 || sx > w + 200) continue;
        const pal = periodPalette(periodIndex.get(node.period.id) ?? 0);
        const isHover = st.hover?.kind === 'period' && st.hover.period.id === node.period.id;
        const isSel = st.selectedPeriodId === node.period.id;
        const tw = 0.85 + 0.15 * Math.sin(t * 0.9 + node.x * 0.01);
        const r = isHover || isSel ? 5.2 : 4.2;
        drawFlare(ctx, sx, sy, 26 + (isHover ? 6 : 0), pal, alpha * 0.8 * tw);
        drawStar(ctx, sx, sy, r, pal, alpha, tw);
        if (isHover) drawRing(ctx, sx, sy, 15 + Math.sin(t * 3) * 2, 0.4);

        // label: name above, dates below
        ctx.textAlign = 'center';
        ctx.font = '500 17px "Cormorant Garamond", Georgia, serif';
        ctx.fillStyle = `rgba(236,229,211,${0.92 * alpha})`;
        try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2.5px'; } catch { /* noop */ }
        ctx.fillText(node.period.name, sx, sy - 24);
        ctx.font = '400 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = `rgba(216,184,106,${0.6 * alpha})`;
        try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px'; } catch { /* noop */ }
        ctx.fillText(`${node.period.start} – ${node.period.end}`, sx, sy - 10);
        try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'; } catch { /* noop */ }
      }

      // — hover tooltip (DOM, tracks the star while panning) —
      const tip = tooltipRef.current;
      if (tip) {
        const hov = st.hover;
        if (hov && hov.kind === 'artist' && !st.dragging) {
          if (tooltipFor !== hov.artist.id) {
            tooltipFor = hov.artist.id;
            const a = hov.artist;
            const dates = a.died ? `${a.born} – ${a.died}` : `b. ${a.born}`;
            tip.textContent = `${dates} · ${periodNames.get(a.periodId) ?? ''}`;
          }
          const [sx, sy] = toScreen(hov.x, hov.y);
          tip.style.transform = `translate(calc(${Math.round(sx)}px - 50%), ${Math.round(sy) + 32}px)`;
          tip.style.opacity = '1';
        } else {
          tooltipFor = null;
          tip.style.opacity = '0';
        }
      }
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [layout, onSelectArtist, onSelectPeriod, periodIndex]);

  return (
    <div className="timeline-stage">
      <canvas ref={canvasRef} aria-label="Constellation timeline of art history" />
      <div ref={tooltipRef} className="timeline-tooltip" />
    </div>
  );
});

export default TimelineView;
