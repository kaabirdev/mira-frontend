# Mira — push notification dashboard

Frontend for Mira, a push-notification SaaS for Web Push, Android (FCM) and iOS (APNs).
Built as static HTML with a small Node build step so the markup can be ported to Laravel
Blade without restructuring the pages.

## Requirements

- Node.js 20+ (tested on Node 26)
- Any static host. The project is currently served by XAMPP at <http://localhost/mira/>.

## Commands

```bash
npm install         # once
npm run build       # build pages + minified CSS
npm run dev         # rebuild pages and watch CSS
```

`build.mjs` expands partials into `src/pages/*.html`, rewrites `%BASE%` for nested pages,
copies JS, fonts, vendor libraries and the favicon, then Tailwind compiles
`src/styles/app.css` into `assets/css/app.css`.

## Structure

```
src/pages/          page sources (marketing + dashboard)
src/partials/       head, sidebar, topbar, script includes
src/styles/app.css  design tokens and components
src/js/data.js      deterministic demo dataset shaped like API responses
src/js/ui.js        theme, sidebar, palette, dialogs, toasts, table hints
src/js/app.js       dashboard tables, forms, charts, CRUD demos
src/js/auth.js      login / register validation
src/js/docs.js      docs navigation, scrollspy, filter, copy
src/js/status.js    status page uptime bars and subscribe form
assets/             build output (CSS, JS, vendor, fonts, favicon)
app/                built dashboard pages
```

Built pages are written to the repository root and `app/`; edit `src/` and rebuild rather
than editing the generated HTML.

## Product rules encoded in the UI

- Delivery statuses are `Pending`, `Queued`, `Processing`, `Accepted`, `Failed`, `Expired`.
- `Accepted` means the provider accepted the message. It is explicitly **not** proof that a
  device displayed it; open/display events are tracked separately.
- Every project gets 1,000 free delivery units per day. Sends reserve units atomically before
  queueing, and quota warnings appear at 80%.
- Secret keys use `mira_sk_` and are shown exactly once. Publishable keys use `mira_pk_`,
  are limited to `subscribers:write`, and can never read data or send notifications.
- Webhooks are signed with HMAC-SHA256 over `timestamp + "." + rawBody`.

## Theming and accessibility

- Light theme by default, plus dark and system modes. The choice is persisted in
  `localStorage` under `mira-theme`.
- Tokens are CSS variables on `data-theme`; there are no runtime CDN dependencies.
- Focus states are visible, motion respects `prefers-reduced-motion`, and tables show a
  horizontal-scroll hint on narrow screens.
- Lighthouse (accessibility, best practices, SEO) scores 100 on the audited marketing,
  auth, docs, overview, usage and data-table pages.

## Demo data and backend hand-off

There is no backend yet. All mutations are in memory and reset on reload. `src/js/data.js`
is shaped like the future REST responses; replace the direct reads of `window.MiraData` in
`src/js/app.js` with `fetch()` calls when the Laravel API is ready.

When porting to Blade:

1. Move `src/pages/*.html` into `resources/views/` and replace `@include partials/...`
   comments with Blade includes.
2. Replace `%BASE%` with Laravel `url()`/`asset()` helpers.
3. Keep `src/styles/app.css` as the Tailwind entry and point `content` globs at the Blade
   views.
4. Serve the same JS modules from `public/js/` and the vendored libraries from
   `public/vendor/`.

## Demo credential

Login accepts any valid email and any password of 8 or more characters; it redirects to the
dashboard. No credentials leave the browser.
