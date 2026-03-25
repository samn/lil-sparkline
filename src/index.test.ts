import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import app from "./index";

function get(query: string) {
  return app.request(`http://localhost/?${query}`);
}

function decodePng(buffer: ArrayBuffer) {
  return PNG.sync.read(Buffer.from(buffer));
}

describe("GET /", () => {
  describe("error handling", () => {
    it("returns 400 when data param is missing", async () => {
      const res = await app.request("http://localhost/");
      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Missing required query parameter: data");
    });

    it("returns 400 when data has fewer than 2 values", async () => {
      const res = await get("data=5");
      expect(res.status).toBe(400);
      expect(await res.text()).toBe("data must contain at least 2 numeric values");
    });

    it("returns 400 when data has no valid numbers", async () => {
      const res = await get("data=abc,def");
      expect(res.status).toBe(400);
      expect(await res.text()).toBe("data must contain at least 2 numeric values");
    });
  });

  describe("successful responses", () => {
    it("returns a valid PNG with correct headers", async () => {
      const res = await get("data=1,2,3");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");

      const png = decodePng(await res.arrayBuffer());
      expect(png.width).toBe(200);
      expect(png.height).toBe(50);
    });

    it("uses default dimensions of 200x50", async () => {
      const res = await get("data=1,5");
      const png = decodePng(await res.arrayBuffer());
      expect(png.width).toBe(200);
      expect(png.height).toBe(50);
    });

    it("respects custom width and height", async () => {
      const res = await get("data=1,2,3&width=400&height=100");
      const png = decodePng(await res.arrayBuffer());
      expect(png.width).toBe(400);
      expect(png.height).toBe(100);
    });

    it("clamps width to max 800", async () => {
      const res = await get("data=1,2,3&width=2000");
      const png = decodePng(await res.arrayBuffer());
      expect(png.width).toBe(800);
    });

    it("clamps height to max 200", async () => {
      const res = await get("data=1,2,3&height=999");
      const png = decodePng(await res.arrayBuffer());
      expect(png.height).toBe(200);
    });

    it("falls back to default for non-numeric width/height", async () => {
      const res = await get("data=1,2,3&width=abc&height=xyz");
      const png = decodePng(await res.arrayBuffer());
      expect(png.width).toBe(200);
      expect(png.height).toBe(50);
    });

    it("silently drops NaN values from data", async () => {
      const res = await get("data=1,abc,3,def,5");
      expect(res.status).toBe(200);
      const png = decodePng(await res.arrayBuffer());
      expect(png.width).toBe(200);
    });

    it("handles decimal values", async () => {
      const res = await get("data=1.5,2.7,3.14");
      expect(res.status).toBe(200);
    });

    it("handles negative values", async () => {
      const res = await get("data=-5,-2,0,3,7");
      expect(res.status).toBe(200);
    });

    it("handles whitespace in data values", async () => {
      const res = await get("data=1,%202,%203");
      expect(res.status).toBe(200);
    });
  });

  describe("colors", () => {
    it("renders transparent background by default", async () => {
      const res = await get("data=0,0");
      const png = decodePng(await res.arrayBuffer());
      // Check a corner pixel that should be transparent (no line drawn there)
      const cornerIdx = 0; // top-left pixel
      expect(png.data[cornerIdx + 3]).toBe(0); // alpha = 0
    });

    it("renders solid background when bg is specified", async () => {
      const res = await get("data=0,0&bg=FF0000");
      const png = decodePng(await res.arrayBuffer());
      // Check a corner pixel — should be red with full alpha
      const cornerIdx = 0;
      expect(png.data[cornerIdx]).toBe(255); // R
      expect(png.data[cornerIdx + 1]).toBe(0); // G
      expect(png.data[cornerIdx + 2]).toBe(0); // B
      expect(png.data[cornerIdx + 3]).toBe(255); // A
    });

    it("falls back to default fg for invalid hex", async () => {
      const res = await get("data=1,2,3&fg=ZZZZZZ");
      expect(res.status).toBe(200);
    });

    it("falls back to transparent for invalid bg hex", async () => {
      const res = await get("data=0,0&bg=nope");
      const png = decodePng(await res.arrayBuffer());
      const cornerIdx = 0;
      expect(png.data[cornerIdx + 3]).toBe(0);
    });

    it("draws foreground pixels with the specified color", async () => {
      // Use a wide image with constant data so the line is horizontal
      // and we can find fg-colored pixels easily
      const res = await get("data=5,5&width=100&height=20&fg=00FF00&bg=000000");
      const png = decodePng(await res.arrayBuffer());

      // Scan for any green pixels (the line)
      let foundGreen = false;
      for (let i = 0; i < png.data.length; i += 4) {
        if (png.data[i + 1]! > 100 && png.data[i]! < 50 && png.data[i + 2]! < 50) {
          foundGreen = true;
          break;
        }
      }
      expect(foundGreen).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles identical data values (flat line)", async () => {
      const res = await get("data=5,5,5,5");
      expect(res.status).toBe(200);
    });

    it("handles exactly 2 data points", async () => {
      const res = await get("data=0,10");
      expect(res.status).toBe(200);
    });

    it("handles many data points", async () => {
      const data = Array.from({ length: 100 }, (_, i) => Math.sin(i / 10) * 50).join(",");
      const res = await get(`data=${data}`);
      expect(res.status).toBe(200);
    });

    it("handles very small dimensions", async () => {
      const res = await get("data=1,2,3&width=5&height=5");
      const png = decodePng(await res.arrayBuffer());
      expect(png.width).toBe(5);
      expect(png.height).toBe(5);
    });

    it("handles large value ranges", async () => {
      const res = await get("data=0,1000000");
      expect(res.status).toBe(200);
    });

    it("handles very small value ranges", async () => {
      const res = await get("data=1.0001,1.0002");
      expect(res.status).toBe(200);
    });
  });
});
