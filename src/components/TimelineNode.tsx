/**
 * Star-drawing primitives for the constellation timeline.
 *
 * The timeline renders on a 2D canvas for performance (one draw call per
 * frame, no DOM churn), so "nodes" here are pure painters rather than React
 * components. TimelineView owns the camera and calls these every frame.
 */

export interface StarPalette {
  core: string;
  halo: string; // rgb triplet, used inside rgba()
}

/** Muted per-period tints — gold, ivory, and dusty pastels. */
const TINTS: StarPalette[] = [
  { core: '#f5ead0', halo: '216,184,106' }, // gold
  { core: '#eee9dd', halo: '198,198,176' }, // ivory
  { core: '#dfe4ea', halo: '150,168,196' }, // dusty blue
  { core: '#eadfd6', halo: '196,158,128' }, // soft amber
  { core: '#e6dde6', halo: '172,150,182' }, // muted violet
];

export function periodPalette(index: number): StarPalette {
  return TINTS[index % TINTS.length];
}

/** Soft glowing star: layered halos + bright core. */
export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  palette: StarPalette,
  alpha: number,
  twinkle = 1,
): void {
  if (alpha <= 0.01) return;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
  halo.addColorStop(0, `rgba(${palette.halo},${0.32 * alpha * twinkle})`);
  halo.addColorStop(0.4, `rgba(${palette.halo},${0.1 * alpha})`);
  halo.addColorStop(1, `rgba(${palette.halo},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.core;
  ctx.globalAlpha = Math.min(1, alpha * (0.82 + 0.18 * twinkle));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Four-point diffraction flare used for period stars. */
export function drawFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  palette: StarPalette,
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(${palette.halo},${0.5 * alpha})`;
  for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
    const grad = ctx.createLinearGradient(-dx * len, -dy * len, dx * len, dy * len);
    grad.addColorStop(0, `rgba(${palette.halo},0)`);
    grad.addColorStop(0.5, `rgba(255,250,238,${0.65 * alpha})`);
    grad.addColorStop(1, `rgba(${palette.halo},0)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-dx * len, -dy * len);
    ctx.lineTo(dx * len, dy * len);
    ctx.stroke();
  }
  ctx.restore();
}

/** Pulsing selection / hover ring. */
export function drawRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
): void {
  ctx.strokeStyle = `rgba(216,184,106,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** Thin constellation line with a gentle fade at both ends. */
export function drawLink(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha: number,
  rgb = '216,184,106',
): void {
  if (alpha <= 0.005) return;
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, `rgba(${rgb},${alpha * 0.35})`);
  grad.addColorStop(0.5, `rgba(${rgb},${alpha})`);
  grad.addColorStop(1, `rgba(${rgb},${alpha * 0.35})`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
