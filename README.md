# Page URL tree (Contentstack Full Page app)

Small React app for a [Full Page UI location](https://www.contentstack.com/docs/developers/developer-hub/full-page-location). It loads stack content types, lists entries via the App SDK `stack.search` API, and groups them in a collapsible tree by the `url` field (segments of the path).

## Run locally

```bash
cd extensions/cs-page-tree-app
npm install
npm run dev
```

The UI only loads data when embedded in Contentstack (SDK initialization). Opening `http://localhost:5173` alone shows the error state; that is expected.

## Wire Developer Hub

1. **Build static assets:** `npm run build` → output in `dist/`.
2. **Host over HTTPS** (required for production): e.g. Azure Static Web Apps, S3+CloudFront, Netlify, or your CDN. For local testing, expose Vite with **ngrok** (or similar) and use that HTTPS URL.
3. In **Developer Hub**, create or open your app → **Hosting** → **Custom hosting** → set the base URL to your deployed site (the URL that serves `index.html`).

### Deploy on Vercel (this monorepo)

1. **Import** the Git repo in [Vercel](https://vercel.com/) and create a new project.
2. **Root Directory:** `extensions/cs-page-tree-app` (Framework Preset can stay “Other” or “Vite” if detected).
3. **Build & Output:** Install `npm install`, Build `npm run build`, Output `dist` (defaults usually match `package.json`).
4. **Production URL:** After deploy, copy `https://<project>.vercel.app` (or your custom domain).
5. **Developer Hub → Hosting:** set **Custom hosting** to that origin **only** (no trailing path unless your Full Page **Path** in step 4 below matches it).

`vercel.json` in this folder rewrites non-`assets` routes to `index.html` so a Full Page **Path** like `page-tree` (`…vercel.app/page-tree`) still loads the app.

**Contentstack URL vs Full Page Path**

- If Hosting base is `https://my-app.vercel.app` and Full Page **Path** is empty or `/`, the iframe loads the site root — fine.
- If you set Full Page **Path** to `page-tree`, Contentstack typically requests `https://my-app.vercel.app/page-tree`; the rewrite sends `index.html`, and `vite` `base: "/"` keeps JS/CSS under `/assets/...` working.

Do **not** set response headers that block embedding (e.g. `X-Frame-Options: DENY` or a restrictive `Content-Security-Policy` `frame-ancestors`) on this deployment, or the app will not load inside Contentstack’s iframe.
4. **UI Locations** → add **Full Page** (path can be empty or `/`). Optionally set name and icon (SVG under 1 MB per [Full Page docs](https://www.contentstack.com/docs/developers/developer-hub/full-page-location)).
5. **Permissions** (same tab): grant scopes needed to read content types and search/list entries (see [OAuth scopes](https://www.contentstack.com/docs/developers/developer-hub/about-ui-locations) in the docs).
6. **Install** the app on your stack. Open it from the stack left navigation.

## Content types

Default selection is `page`. Use the dropdown for any type that has a `url` (or `title`) field on entries. Entries without `url` appear under the root group.

## Repo script (from monorepo root)

```bash
npm run dev:page-tree
```
