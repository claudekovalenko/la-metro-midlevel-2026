# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The site + native iOS wrapper for the LA Metro Midlevel 2026 gathering: an application form and an interactive SoCal demographics reference. Plain HTML/CSS/JS, no build step, no framework, no backend.

## Structure

- `docs/` — the actual website. This is what GitHub Pages serves *and* what the iOS app displays (GitHub Pages is configured to deploy from `main`, folder `/docs`, not root — the site lives in `docs/` specifically so it can share a folder with the native app).
  - `index.html` — landing page linking to the other two pages.
  - `gospel-workers-application.html` — the application/church-health-survey form.
  - `socal-people-groups-breakdown.html` — interactive D3 map of LA/Orange County demographics, used for ministry planning.
  - `manifest.json` / `sw.js` — PWA manifest and a cache-first service worker. `sw.js` precaches an explicit `PRECACHE_URLS` list — **any time an HTML/asset filename in `docs/` changes or a new top-level page is added, update `PRECACHE_URLS` and bump `CACHE_NAME` (e.g. `v3` → `v4`)**, or returning visitors will keep serving stale cached pages.
- `ios/` — a native Xcode project (via [Capacitor](https://capacitorjs.com)) that wraps `docs/` in an iOS app shell. There is no separate native codebase to maintain — it just loads the same site. Can only be built/signed on a Mac with Xcode; not buildable from this environment.
- `capacitor.config.json` — points the native wrapper at `docs/` (`webDir`).

There is no `src/`, no bundler, no package beyond the three Capacitor npm deps used only for the iOS wrapper.

## Commands

- Run the site locally: `npx serve docs` (no build step — just static files).
- `npm install` — only needed for the Capacitor/iOS tooling, not for editing the site.
- After changing anything in `docs/`, sync it into the Xcode project: `npx cap sync ios`.
- There is no lint or test suite configured (`npm test` is a stub that exits with an error).
- iOS build/archive/upload requires Xcode on a Mac and is out of scope for this environment.

## Conventions

- Each HTML page is self-contained: inline `<style>` in the `<head>`, inline `<script>` before `</body>`. Follow this pattern rather than introducing separate CSS/JS files or a bundler.
- Shared visual language across pages: dark navy background (`--night-deep: #161D2A`), gold/sage/clay accent palette, `Fraunces` (serif, headings) + `Inter` (body) loaded from Google Fonts. Keep new pages visually consistent with these CSS custom properties rather than inventing a new palette.
- `socal-people-groups-breakdown.html` loads D3 and topojson from a CDN (jsdelivr) and fetches US Census county boundary TopoJSON live at runtime — it requires network access to render and has no offline fallback beyond a "failed to load" message. Demographic figures are a mix of real ACS estimates (Santa Ana, Irvine, Compton, Monterey Park) and directional approximations for the rest — see the in-page note before changing figures or claiming precision they don't have.
- **`gospel-workers-application.html` calls `window.storage.set/get/list`, which is not defined anywhere in this codebase.** It's a leftover from the environment this page was originally prototyped in and does not exist on GitHub Pages or in the iOS WebView — form submissions currently go nowhere. This matches the README's "Known open item": a real backend (e.g. FormSubmit.co, Google Form, or Airtable) still needs to be wired in before this form actually works in production. Don't assume `window.storage` works; treat it as needing replacement, not extension.

## Deployment

- GitHub Pages serves `main` branch, `/docs` folder — merging to `main` deploys the site directly, there is no separate deploy step or CI build.
- `.github/workflows/auto-merge-claude-branches.yml` auto-opens and squash-merges a PR into `main` for any push to a `claude/**` branch, specifically so GitHub Pages picks up the change. Pushing to a `claude/*` branch is effectively pushing to production.
- iOS releases are manual (Xcode → Archive → App Store Connect) and not part of this repo's automation.
