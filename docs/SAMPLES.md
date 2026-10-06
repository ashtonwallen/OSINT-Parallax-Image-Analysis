# Synthetic sample provenance

Both scenes were generated for Parallax using the built-in image generation tool on October 6, 2026. They are synthetic illustrations, not photographs documenting actual places or events. No real camera or GPS metadata is asserted. The original generated PNGs were encoded as JPEGs with Sharp at quality 88, without metadata, and bundled locally.

| Asset                       | Size        | Purpose                                                  |
| --------------------------- | ----------- | -------------------------------------------------------- |
| `public/samples/square.jpg` | 1536 × 1024 | Signage, architecture, transport and shadow observations |
| `public/samples/harbor.jpg` | 1536 × 1024 | Architecture, vegetation and diffuse-light observations  |

`src/lib/demo.ts` contains hand-authored observations. They are never represented as a live API response. Generated geometry may be inconsistent; neither scene is a calibrated solar measurement fixture. Unit tests use mathematically constructed points instead.

## Square generation prompt

Use case: photorealistic-natural. Asset type: bundled synthetic demonstration image for an OSINT educational web application. Create one landscape 1536x1024 photo: broad sunlit Lisbon-inspired public square with Portuguese pale limestone cobblestone mosaic pavement occupying lower half, historic warm cream and terracotta buildings with ornate windows, a single classic yellow tram on the right midground, overhead tram cables, a blue-and-white street sign reading RUA DA PRATA on left building, a few very distant unidentifiable silhouettes only. A black streetlamp in the left foreground with a visible long shadow falling diagonally across the square. Bright clear pale blue sky. Rich realistic natural photographic textures, sophisticated documentary photography, warm afternoon sunlight, slightly muted film colors. No overlay, no watermark, no branding, no readable license plates. Scene is fictional, for illustration only.

## Harbor generation prompt

Use case: photorealistic-natural. Asset: self-generated synthetic OSINT educational demo scene. Landscape documentary photograph 1536x1024 of a fictional quiet Nordic harbor waterfront, red ochre timber warehouses, gray slate roofs, dark conifer trees on hillside, simple bicycles with no brands, no people, small moored white boats without names, overcast cool soft light, rippling dark blue water in foreground. Natural restrained photography, exquisite textures, wide composition. No readable license plates, text overlays, watermarks or logos.
