/** Helpers for Wikimedia image URLs and generated placard textures. */

/**
 * Rewrites a Wikimedia thumb URL to a different width, e.g. for small
 * preview strips. Falls back to the original URL if the pattern is absent
 * (which happens when the source image is smaller than the requested thumb).
 */
export function thumbAtWidth(url: string, width: number): string {
  return url.replace(/\/(\d+)px-/, `/${width}px-`);
}

export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface PlacardOptions {
  title: string;
  subtitle?: string;
  note?: string;
  width?: number;
  height?: number;
}

/**
 * Generates a tasteful in-scene placard texture (used for wall titles,
 * painting labels, and "image unavailable — rights restricted" canvases,
 * so the 3D scene never depends on an external font loader).
 */
export function makePlacardCanvas({ title, subtitle, note, width = 1024, height = 1024 }: PlacardOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep charcoal field with a soft vignette.
  ctx.fillStyle = '#15161b';
  ctx.fillRect(0, 0, width, height);
  const vg = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.75);
  vg.addColorStop(0, 'rgba(255,255,255,0.045)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);

  // Thin gold rule.
  ctx.strokeStyle = 'rgba(216,184,106,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(width * 0.07, height * 0.07, width * 0.86, height * 0.86);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9e2cf';

  const fitLines = (text: string, font: string, maxWidth: number): string[] => {
    ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const probe = line ? `${line} ${word}` : word;
      if (ctx.measureText(probe).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = probe;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 4);
  };

  const titleFont = `500 ${Math.round(height * 0.072)}px Georgia, 'Times New Roman', serif`;
  const lines = fitLines(title, titleFont, width * 0.74);
  const lineH = height * 0.092;
  let y = height * 0.46 - ((lines.length - 1) * lineH) / 2;
  ctx.font = titleFont;
  for (const l of lines) {
    ctx.fillText(l, width / 2, y);
    y += lineH;
  }

  if (subtitle) {
    ctx.font = `400 ${Math.round(height * 0.04)}px Georgia, serif`;
    ctx.fillStyle = 'rgba(216,184,106,0.85)';
    ctx.fillText(subtitle, width / 2, y + height * 0.015);
    y += height * 0.07;
  }

  if (note) {
    ctx.font = `300 ${Math.round(height * 0.03)}px Verdana, sans-serif`;
    ctx.fillStyle = 'rgba(233,226,207,0.55)';
    const noteLines = fitLines(note, ctx.font, width * 0.7);
    for (const l of noteLines) {
      ctx.fillText(l, width / 2, y + height * 0.04);
      y += height * 0.045;
    }
  }

  return canvas;
}
