# lil-sparkline

A tiny Cloudflare Worker that renders sparkline charts as PNG images. Designed for embedding inline in Slack messages, GitHub READMEs, or anywhere that supports image URLs.

## Usage

Pass your data as comma-separated values:

```
https://your-worker.workers.dev/?data=1,3,5,2,8,4,7
```

Customize dimensions and colors:

```
https://your-worker.workers.dev/?data=10,20,15,25&width=400&height=100&fg=FF6600&bg=FFFFFF
```

See [SPEC.md](SPEC.md) for the full API specification.

## Development

```bash
npm install
npm run dev
```

Then open http://localhost:8787/?data=1,3,5,2,8,4,7 in your browser.

## Deploy

```bash
npx wrangler login
npm run deploy
```
