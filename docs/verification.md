# Release verification · 2026-09-08

- Codex and Claude time cards appear before news, with automatic visitor-timezone formatting and an approximate countdown for Tibo’s currently announced time.
- Nine locales build to 342 static pages from 37 records. English is the default. Localized permalinks, canonical metadata, hreflang, sitemap, RSS and public JSON remain available.
- Nineteen unit tests pass, covering source identities, relay mismatches, incomplete evidence, explicit schedule parsing, Pacific offsets, countdown lifecycle, offer expiry, source freshness, deduplication and calendar safety.
- Actual live browser checks pass for nine languages at 1440, 768 and 390 CSS pixels. Filters by platform and event type, pagination, local timer persistence, calendar export, FAQ, language changes, event pages and keyboard entry were exercised.
- Browser clock tests verify Shanghai, Los Angeles and Berlin: the absolute countdown agrees, local date boundaries differ correctly, unknown times remain unset, and elapsed announcements wait for confirmation.
- The personal website’s AI collection opens the tracker in English. The header retains its complete pixel cursor. Chinese mobile rendering and the support link were checked in production.
- [Cloud run 34170684119](https://github.com/shixi-11/codex-respawn/actions/runs/34170684119) successfully polled both author timelines, checked 13 relevant X embeds with zero failures, verified the official Claude promotion, generated the daily digest, committed data and deployed the site. Its successful check is recorded at 2026-09-07T23:38:08.997Z.
- Claude’s extra-usage promotion is distinguished from a reset card. The Codex grant rail labels a historical announcement and directs visitors to verify their own accounts.

Public timelines are relayed through FxEmbed, with independent official-embed checks. No paid API or model is required by the scheduled pipeline. Future source availability and GitHub schedule timing are not guaranteed; failures and stale data remain visible. No private account balance or audience-growth claim is inferred from these tests.
