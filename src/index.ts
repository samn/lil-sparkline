import { Hono } from "hono";
import { renderSparkline } from "./sparkline";

const app = new Hono();

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 50;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 200;
const DEFAULT_FG = "4A90D9";

function parseHex(hex: string | undefined, fallback: string): [number, number, number] | null {
  const value = hex ?? fallback;
  if (value === "transparent") return null;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return parseHex(undefined, fallback);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

app.get("/", (c) => {
  const url = new URL(c.req.url);
  const dataParam = url.searchParams.get("data");

  if (!dataParam) {
    return c.text("Missing required query parameter: data", 400);
  }

  const data = dataParam
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n));

  if (data.length < 2) {
    return c.text("data must contain at least 2 numeric values", 400);
  }

  const widthParam = url.searchParams.get("width");
  const heightParam = url.searchParams.get("height");
  const width = clamp(
    widthParam ? parseInt(widthParam, 10) || DEFAULT_WIDTH : DEFAULT_WIDTH,
    1,
    MAX_WIDTH,
  );
  const height = clamp(
    heightParam ? parseInt(heightParam, 10) || DEFAULT_HEIGHT : DEFAULT_HEIGHT,
    1,
    MAX_HEIGHT,
  );

  const fg = parseHex(url.searchParams.get("fg") ?? undefined, DEFAULT_FG)!;
  const bg = parseHex(
    url.searchParams.get("bg") ?? undefined,
    "transparent",
  );

  const png = renderSparkline({ data, width, height, fg, bg });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

export default app;
