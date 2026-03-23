# lil-sparkline API Specification

## Endpoint

```
GET /
```

Returns a PNG image of a sparkline chart rendered from the provided data.

## Query Parameters

| Parameter | Type   | Required | Default       | Description                              |
|-----------|--------|----------|---------------|------------------------------------------|
| `data`    | string | Yes      | —             | Comma-separated numeric values (min 2)   |
| `width`   | int    | No       | `200`         | Image width in pixels (max 800)          |
| `height`  | int    | No       | `50`          | Image height in pixels (max 200)         |
| `fg`      | string | No       | `4A90D9`      | Foreground (line) color as 6-char hex    |
| `bg`      | string | No       | *transparent* | Background color as 6-char hex, or omit for transparent |

### Parameter Details

#### `data`
Comma-separated list of numeric values. Whitespace around values is trimmed. Non-numeric values are silently dropped. After parsing, at least 2 valid numeric values must remain or the request returns a 400 error.

```
data=1,3,5,2,8,4,7
data=10.5, 20.3, 15.7, 25.1
data=0,0,0,100,0,0,0
```

#### `width` / `height`
Integer pixel dimensions. Values are clamped to their allowed ranges — values below 1 become 1, values above the maximum become the maximum. Non-numeric values fall back to the default.

- **Width**: 1–800 (default: 200)
- **Height**: 1–200 (default: 50)

The default 200x50 (4:1 aspect ratio) is sized for inline display in Slack messages.

#### `fg` (foreground color)
6-character hex color string without `#`. Controls the sparkline line color. Invalid values fall back to the default.

Default: `4A90D9` (steel blue) — chosen from colorblind-safe palettes. Provides good contrast on both light and dark backgrounds and is distinguishable across protanopia, deuteranopia, and tritanopia.

#### `bg` (background color)
6-character hex color string without `#`. Controls the image background. Omit for a transparent background (default). Invalid values fall back to transparent.

Transparent is the default because it adapts to both Slack light and dark themes without a visible bounding box.

## Response

### Success (200)

```
Content-Type: image/png
Cache-Control: public, max-age=86400
```

Body: PNG image data.

Each unique URL produces a unique image, so responses are cached for 24 hours.

### Errors (400)

Returned as `text/plain` with a descriptive message.

| Condition                  | Response body                                      |
|----------------------------|----------------------------------------------------|
| Missing `data` parameter   | `Missing required query parameter: data`           |
| Fewer than 2 valid numbers | `data must contain at least 2 numeric values`      |

## Examples

Basic sparkline:
```
/?data=1,3,5,2,8,4,7
```

Custom dimensions:
```
/?data=10,20,15,25,30,20&width=400&height=100
```

Custom colors (orange line on white background):
```
/?data=1,4,2,5,3&fg=FF6600&bg=FFFFFF
```

Green line, transparent background:
```
/?data=5,3,8,1,9,4&fg=2ECC40
```
