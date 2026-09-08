# Verification

2026-09-08: automatic public reset tracker.

- 20 unit tests passed: source identity, incomplete and quoted posts, announcement parsing, stale verification, elapsed deadlines, timezones, DST, calendar escaping and offer expiry.
- 10 browser scenarios passed: no manual inputs, watching without a schedule, no historical alert on enable, a new countdown, changed times, cancellation, new completion, repeat suppression, failed polling and the actual scheduled-time alert.
- 27 locale/viewport combinations passed at 1440, 768 and 390 pixels. Filters, pagination, FAQ, language switching, event pages and keyboard entry passed without page errors or missing images.
- The Blender 4.5 LTS scene and transparent render were inspected, then the render was checked in desktop and Chinese mobile layouts. The site uses a lightweight WebP, not a runtime WebGL scene.
- GitHub Pages deployment [34195736798](https://github.com/shixi-11/codex-claude-resets/actions/runs/34195736798) succeeded. The actual personal-domain site, its AI-collection entry, English default, Chinese mobile page, logo, transparent mascot and support link were checked in Chrome.
- Old paths with and without a trailing slash return a permanent redirect to the new tracker. Language paths normalize to a trailing slash to preserve relative asset loading. Main-site deployment b2a2cfd passed Vercel.

Published data polls every minute while the page is visible and on returning to the page. Source collection remains twice hourly; calendar alerts and in-page alerts have different delivery constraints. Background browser throttling can delay in-page alerts. Public announcements do not verify a visitor's actual balance.
