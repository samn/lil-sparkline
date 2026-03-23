import { PNG } from "pngjs";

export interface SparklineOptions {
  data: number[];
  width: number;
  height: number;
  fg: [number, number, number];
  bg: [number, number, number] | null; // null = transparent
}

export function renderSparkline(opts: SparklineOptions): Buffer {
  const { data, width, height, fg, bg } = opts;
  const png = new PNG({ width, height });

  // Fill background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) << 2;
      if (bg) {
        png.data[idx] = bg[0];
        png.data[idx + 1] = bg[1];
        png.data[idx + 2] = bg[2];
        png.data[idx + 3] = 255;
      } else {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      }
    }
  }

  // Normalize data to pixel coordinates
  const padding = 2;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points: [number, number][] = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding - 1);
    const y = padding + (1 - (v - minVal) / range) * (height - 2 * padding - 1);
    return [x, y];
  });

  // Draw anti-aliased line segments (Wu's algorithm)
  for (let i = 0; i < points.length - 1; i++) {
    drawLineWu(png, width, height, points[i], points[i + 1], fg);
  }

  return PNG.sync.write(png);
}

function plot(
  png: PNG,
  width: number,
  height: number,
  x: number,
  y: number,
  fg: [number, number, number],
  brightness: number,
) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (y * width + x) << 2;
  const existing = png.data[idx + 3] / 255;
  const alpha = Math.min(1, existing + brightness);
  // Blend: if background pixel exists, blend fg onto it
  if (existing > 0 && png.data[idx + 3] > 0) {
    const invBr = 1 - brightness;
    png.data[idx] = Math.round(fg[0] * brightness + png.data[idx] * invBr);
    png.data[idx + 1] = Math.round(fg[1] * brightness + png.data[idx + 1] * invBr);
    png.data[idx + 2] = Math.round(fg[2] * brightness + png.data[idx + 2] * invBr);
    png.data[idx + 3] = Math.round(alpha * 255);
  } else {
    png.data[idx] = fg[0];
    png.data[idx + 1] = fg[1];
    png.data[idx + 2] = fg[2];
    png.data[idx + 3] = Math.round(brightness * 255);
  }
}

function drawLineWu(
  png: PNG,
  width: number,
  height: number,
  p0: [number, number],
  p1: [number, number],
  fg: [number, number, number],
) {
  let [x0, y0] = p0;
  let [x1, y1] = p1;

  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (steep) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
  }
  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const gradient = dx === 0 ? 1 : dy / dx;

  // First endpoint
  let xend = Math.round(x0);
  let yend = y0 + gradient * (xend - x0);
  let xgap = rfpart(x0 + 0.5);
  const xpxl1 = xend;
  const ypxl1 = Math.floor(yend);

  if (steep) {
    plot(png, width, height, ypxl1, xpxl1, fg, rfpart(yend) * xgap);
    plot(png, width, height, ypxl1 + 1, xpxl1, fg, fpart(yend) * xgap);
  } else {
    plot(png, width, height, xpxl1, ypxl1, fg, rfpart(yend) * xgap);
    plot(png, width, height, xpxl1, ypxl1 + 1, fg, fpart(yend) * xgap);
  }

  let intery = yend + gradient;

  // Second endpoint
  xend = Math.round(x1);
  yend = y1 + gradient * (xend - x1);
  xgap = fpart(x1 + 0.5);
  const xpxl2 = xend;
  const ypxl2 = Math.floor(yend);

  if (steep) {
    plot(png, width, height, ypxl2, xpxl2, fg, rfpart(yend) * xgap);
    plot(png, width, height, ypxl2 + 1, xpxl2, fg, fpart(yend) * xgap);
  } else {
    plot(png, width, height, xpxl2, ypxl2, fg, rfpart(yend) * xgap);
    plot(png, width, height, xpxl2, ypxl2 + 1, fg, fpart(yend) * xgap);
  }

  // Main loop — draw with 2px thickness by plotting extra rows
  if (steep) {
    for (let x = xpxl1 + 1; x < xpxl2; x++) {
      const y = Math.floor(intery);
      plot(png, width, height, y - 1, x, fg, rfpart(intery) * 0.5);
      plot(png, width, height, y, x, fg, rfpart(intery));
      plot(png, width, height, y + 1, x, fg, fpart(intery));
      plot(png, width, height, y + 2, x, fg, fpart(intery) * 0.5);
      intery += gradient;
    }
  } else {
    for (let x = xpxl1 + 1; x < xpxl2; x++) {
      const y = Math.floor(intery);
      plot(png, width, height, x, y - 1, fg, rfpart(intery) * 0.5);
      plot(png, width, height, x, y, fg, rfpart(intery));
      plot(png, width, height, x, y + 1, fg, fpart(intery));
      plot(png, width, height, x, y + 2, fg, fpart(intery) * 0.5);
      intery += gradient;
    }
  }
}

function fpart(x: number): number {
  return x - Math.floor(x);
}

function rfpart(x: number): number {
  return 1 - fpart(x);
}
