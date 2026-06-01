# ChessPlay Brand Asset License Notes

## Scope

This document covers the ChessPlay brand assets used by the web application, including logo SVGs, favicon assets, app/manifest icons, and Open Graph preview images.

Covered files include:

- `frontend/public/brand-logo.svg`
- `frontend/public/brand-logo-dark.svg`
- `frontend/public/brand-icon.svg`
- `frontend/public/favicon.svg`
- `frontend/public/favicon.ico`
- `frontend/public/favicon-16x16.png`
- `frontend/public/favicon-32x32.png`
- `frontend/public/apple-touch-icon.png`
- `frontend/public/android-chrome-192x192.png`
- `frontend/public/android-chrome-512x512.png`
- `frontend/public/og-image.svg`
- `frontend/public/og-image.png`

## Asset Ownership

All ChessPlay brand SVGs are original internal brand assets created for ChessPlay.

No third-party copyrighted logos, icon packs, chess-piece artwork, stock images, downloaded favicon packs, or vendor-provided brand assets are intentionally included in these files.

## Fonts

The SVG files reference common font-family names such as `Montserrat`, `Inter`, and `Arial` for text rendering, but no font files are embedded inside the SVG assets.

The web app loads Google Fonts externally from Google Fonts in `frontend/index.html`. No font binaries are committed into this repository for the brand assets.

## Favicon and Manifest Icons

The favicon and app icon assets are generated from the internal ChessPlay logo/icon source:

- Source icon: `frontend/public/brand-icon.svg`
- Generated favicon/app outputs:
  - `frontend/public/favicon.svg`
  - `frontend/public/favicon.ico`
  - `frontend/public/favicon-16x16.png`
  - `frontend/public/favicon-32x32.png`
  - `frontend/public/apple-touch-icon.png`
  - `frontend/public/android-chrome-192x192.png`
  - `frontend/public/android-chrome-512x512.png`

These files are not copied from a third-party favicon pack.

## Open Graph Image

The Open Graph image is an original ChessPlay brand composition generated from the internal ChessPlay logo/brand system.

- Source file: `frontend/public/og-image.svg`
- Generated output: `frontend/public/og-image.png`

## QA Verification Notes

Before release, verify:

1. `frontend/index.html` references the expected favicon and OG files.
2. `frontend/public/manifest.json` references `brand-icon.svg`, `android-chrome-192x192.png`, and `android-chrome-512x512.png`.
3. All referenced public asset paths load after production build.
4. Social preview uses `og-image.png`.
5. No unrelated third-party image or favicon-pack metadata appears in committed brand assets.
