# External Integrations

**Analysis Date:** 2026-03-28

## APIs & External Services

**Third-party APIs:**
- Not detected in application code under `src/`; there are no SDK imports for SaaS APIs and no outbound HTTP calls beyond static asset loading in `src/lib/schema.js`

**Static app asset loading:**
- App-served JSON bundles - schema, model, and preset data are fetched from the same deployed site
  - SDK/Client: browser `fetch` in `src/lib/schema.js`
  - Auth: none detected
  - Sources: `public/schema/index.json`, `public/schema/categories/*.json`, `public/models/*.json`, `public/presets/system-presets.json`

## Data Storage

**Databases:**
- IndexedDB in the browser
  - Connection: no env var; instantiated through Dexie in `src/store/useAppStore.js`
  - Client: `dexie`
  - Usage: gallery entries stored in `vixenlabs-gallery` / `images` table in `src/store/useAppStore.js`

**File Storage:**
- Static repository assets only via `public/` and generated `dist/`; no external object storage detected

**Caching:**
- Service-worker asset caching through `vite-plugin-pwa` Workbox config in `vite.config.js`
  - Cached asset pattern: `**/*.{js,css,html,png,svg,json}`

## Authentication & Identity

**Auth Provider:**
- None detected
  - Implementation: app is fully client-side with no login flow in `src/` and no auth configuration files present

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- No dedicated logging framework detected; user-facing error state is surfaced from `initialize()` into React state in `src/store/useAppStore.js` and rendered in `src/App.jsx`

## CI/CD & Deployment

**Hosting:**
- GitHub Pages
  - Build/deploy workflow: `.github/workflows/deploy.yml`
  - Base path: `/vixenlabs_cx/` in `vite.config.js`

**CI Pipeline:**
- GitHub Actions
  - `actions/setup-node@v4` with Node 20 and npm cache in `.github/workflows/deploy.yml`
  - `npm ci` then `npm run build` before Pages artifact upload in `.github/workflows/deploy.yml`

## Environment Configuration

**Required env vars:**
- None detected from repository evidence

**Secrets location:**
- No application secrets detected in tracked config files reviewed for this analysis
- GitHub Actions deployment relies on GitHub Pages permissions in `.github/workflows/deploy.yml`, not app-level env vars

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Browser/Platform Integrations

**Progressive Web App:**
- Service worker registration via `registerSW({ immediate: true })` in `src/main.jsx`
- Web app manifest configured in `vite.config.js`

**Clipboard:**
- Prompt copy uses `navigator.clipboard.writeText` in `src/store/useAppStore.js`

**Local persistence:**
- User presets and working settings use `localStorage` in `src/lib/storage.js`
- Gallery history uses IndexedDB/Dexie in `src/store/useAppStore.js`

**File import/export:**
- JSON export uses Blob/Object URL download in `src/store/useAppStore.js`
- JSON import uses file input and `file.text()` in `src/components/PromptPanel.jsx`

---

*Integration audit: 2026-03-28*
