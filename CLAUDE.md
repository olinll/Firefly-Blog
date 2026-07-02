# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefly is a feature-rich static blog theme built on **Astro 6** with **Svelte 5** for interactive components. It's a fork of [Fuwari](https://github.com/saicaca/fuwari) extended with extensive features. Primary language is Chinese (Simplified) with i18n for en, zh_TW, ja, ru. Package manager is **pnpm** (enforced via `preinstall`). Node.js >= 22, pnpm >= 9.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build (icons → LQIPs → Astro build → Pagefind indexing) |
| `pnpm preview` | Preview production build |
| `pnpm check` | `astro check` for type/error checking |
| `pnpm type-check` | `tsc --noEmit --isolatedDeclarations` |
| `pnpm lint` | Biome lint + auto-fix |
| `pnpm format` | Biome format |
| `pnpm icons` | Regenerate icon registry only (`src/constants/icons.ts`) |
| `pnpm lqips` | Regenerate LQIP map only (`src/constants/lqips.json`) |
| `pnpm new-post <slug>` | Scaffold a post (CLI mode if slug given; otherwise interactive via `@clack/prompts`) |

## Architecture

### Astro + Svelte Hybrid

- `.astro` components for static content and layouts
- `.svelte` components for interactive UI (search, settings, pagination, archive, TOC) — mounted with `client:load` or `client:visible`
- Swup.js handles SPA-like transitions. The **containers list in `astro.config.mjs` is canonical** — `#banner-overlay-container`, `#banner-dim-container`, `#swup-container`, `#left-sidebar-dynamic`, `#right-sidebar-dynamic`, `#floating-toc-wrapper`. Sidebars are split into static + dynamic variants so per-page sidebar visibility changes don't flash; see `MainGridLayout.astro` for the swup-aware grid logic.

### Configuration-Driven

All features are toggled/configured via TypeScript files in `src/config/`, exported through the barrel at `src/config/index.ts`. Types live in `src/types/`. Every config field is documented with inline Chinese comments — match this style when adding new fields.

**Page visibility gating (`siteConfig.pages`)** is enforced in three places: 404 + nav-menu hide (when `false`) + sitemap filter (in `astro.config.mjs`). When adding a new opt-in page, hook all three.

### Layout System

- `Layout.astro` — base HTML shell, theme init, analytics, Swup hooks, banner carousel, progress bar, scroll handlers (large file — most cross-cutting state lives here)
- `MainGridLayout.astro` — full page grid with sidebar(s), navbar, wallpaper, footer; computes grid columns from `sidebarLayoutConfig`

### Content Collections

Defined in `src/content.config.ts`:
- `posts` — `.md`/`.mdx` with frontmatter: `title`, `published`, `tags`, `category`, `draft`, `pinned`, `password`, `passwordHint`, `comment`, `lang`, `image` (`"api"` triggers random cover), `sourceLink`, `licenseName`, `licenseUrl`, `author`. The `password` / `passwordHint` fields unlock encrypted rendering.
- `spec` — special pages (about, guestbook, friends). Empty schema.

### Path Aliases (tsconfig.json)

`@components/*`, `@assets/*`, `@constants/*`, `@utils/*`, `@i18n/*`, `@layouts/*` → `./src/<dir>/*`; `@/*` → `./src/*`. Use them — don't write long relative paths.

## Non-Obvious Subsystems

### Encrypted Posts

Two-stage: server encrypts at render time, browser decrypts on demand. Flow:

1. `EncryptedPost.astro` → wraps content in `EncryptedContent.astro`
2. `EncryptedContent.astro` calls `encryptContent(html, password, slug)` from `@utils/crypto-utils` — **AES-256-GCM with PBKDF2 (100k iterations)**, deterministic salt/IV derived from `HMAC(password, "salt:<slug>")` so the same inputs always produce the same ciphertext (enables sessionStorage caching)
3. Encrypted blob is `base64(salt[16] + iv[12] + authTag[16] + ciphertext)` rendered into `data-encrypted`
4. Inline `<script>` decrypts on the client using WebCrypto `crypto.subtle`, caches password in `sessionStorage` under `pw:<slug>`, and re-injects `<script>` tags from decrypted HTML (innerHTML-injected scripts are inert by default)
5. After decryption, dispatches `password:decrypted` event — `Layout.astro` listens for it to re-run overflow/scrollbar initialization

### Banner / Wallpaper Modes

Four modes via `backgroundWallpaper.mode`: `banner` (top hero), `fullscreen`, `overlay` (transparent over content), `none`. `switchable: true` lets users toggle at runtime via the `WallpaperSwitch` control. The current mode is stored in `localStorage("wallpaperMode")` and synced to `<html data-wallpaper-mode>` early in `Layout.astro` to avoid flicker. Each device breakpoint can independently enable/disable waves + gradient overlays.

### Music Player

Single-instance pattern: `MusicManager.astro` (mounted once in `Layout.astro`) owns the only `<audio>` element; per-widget `Music.astro` views are pure UI that talk to the manager via `CustomEvent` (`music:*`). Don't create a second audio element — they'll fight.

### Bangumi

Two data modes (`siteConfig.bangumi.mode`):
- `static` — fetched at build via `api.bangumi.one`, baked into HTML (longer build, zero runtime)
- `dynamic` — fetched client-side at runtime, always current

### Comments

Comment service is global (`commentConfig.type`: `none` | `twikoo` | `waline` | `giscus` | `disqus` | `artalk`). Individual posts can opt out via frontmatter `comment: false`. Comment script receives the page-loaded signal via the `firefly:page:loaded` `CustomEvent` dispatched by `Layout.astro` after Swup page:view.

### LQIP (Low-Quality Image Placeholders)

`scripts/generate-lqips.ts` resizes every image under `src/` and `public/` (except excluded dirs) to a 2×2 PNG and extracts a hex color average → `src/constants/lqips.json`. `ImageWrapper.astro` reads the map and shows a blurred gradient placeholder that fades out on `img.load`. Run `pnpm lqips` after adding new images, and commit the regenerated JSON.

### Icons

`scripts/generate-icons.js` walks `astro-icon`'s include list and emits a TypeScript registry → `src/constants/icons.ts` (gitignored from Biome formatting). Regenerate with `pnpm icons` after changing the icon include list in `astro.config.mjs`.

### Markdown Pipeline

`astro.config.mjs` wires a `unified()` processor with 9 remark + 9 rehype plugins. Notable ones:
- `remark-directive` + `parseDirectiveNode` → custom container directives (`github:user/repo` cards via `rehype-components`, `image-grid`, `mermaid`, `plantuml`)
- `remark-admonition-to-blockquote-callout` — converts `!!!` / `???` Python-Markdown syntax (toggleable per `siteConfig.post.rehypeCallouts.enablePythonMarkdownAdmonitions`)
- `rehype-callouts` theme selected from `siteConfig.post.rehypeCallouts.theme` (`github` | `obsidian` | `vitepress` | `docusaurus`); the CSS module is aliased through Vite as `@rehype-callouts-theme`
- `rehype-email-protection` — base64-encodes email addresses to defeat scrapers
- `rehype-external-links` — opens external links with proper `rel`/`target` based on `siteConfig.site_url`

Plugins are mostly pure transforms — pass them through `unified()`, not the older Astro hook API.

### Sidebar Layout

`sidebarLayoutConfig.position`: `left` | `right` | `both`. When set to `left` or `right`, `showBothSidebarsOnPostPage` lets you gain the opposite sidebar only on post detail pages (useful for TOC). `tabletSidebar` controls 769–1279 px breakpoint. Each component entry has `position: "top" | "sticky"`, `showOnPostPage`, `showOnNonPostPage`. Sticky spacing is recomputed on scroll via `updateSidebarStickySpacing()` in `Layout.astro`.

### Redirects

`src/config/redirectsConfig.ts` is the single source for path redirects. It's converted to Astro's `redirects` field via `buildAstroRedirects()`. **Caveat: this is a static-output site, so Astro emits `<meta http-equiv="refresh">` HTML pages (HTTP 200), not real HTTP 302s.** For true 302s, also add a rule in the platform (Vercel / Cloudflare / EdgeOne) config.

### i18n

`i18n(key)` looks up `siteConfig.lang` in `src/i18n/languages/*.ts`. Missing translations fall back: current lang → `zh_CN` → `en` (default). Keys are defined in `src/i18n/i18nKey.ts` as an enum-style const; types are inferred automatically. **English is the schema source — add the key to `en.ts` first**, then other languages.

## Code Style

- **Biome** enforces: tab indentation, double quotes, `noInferrableTypes`, `useAsConstAssertion`, `noUnusedTemplateLiteral`, organized imports on
- Relaxed for `.svelte` / `.astro` / `.vue`: `useConst`, `useImportType`, `noUnusedVariables`, `noUnusedImports` all off
- Biome excludes `src/**/*.css`, `src/public/**`, `dist/**`, `node_modules/**`, and the two generated constants files
- Commit convention: **Conventional Commits** (`feat:`, `fix:`, `chore:`, etc.) — per `CONTRIBUTING.md`, keep PRs focused on a single purpose

## Build Pipeline

Multi-step `pnpm build`:
1. `node scripts/generate-icons.js` → `src/constants/icons.ts`
2. `npx tsx scripts/generate-lqips.ts` → `src/constants/lqips.json`
3. `astro build` → `dist/`
4. `pagefind --site dist` → builds the search index into `dist/pagefind/`

Both generated constants files are committed; regenerate them when you add new icons or images.

## Deployment

- **Vercel** (default, `vercel.json` — security headers + 1-year cache for `/_astro/*`)
- **Cloudflare Workers** — set `CF_WORKERS=1` env var (selects the `@astrojs/cloudflare` adapter in `astro.config.mjs`); `wrangler.jsonc` configures the worker
- **EdgeOne Pages** — `edgeone.json` mirrors Vercel headers
- Static output to `dist/`