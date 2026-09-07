# Release verification · 2026-09-08

- Nine locales build to 198 static pages from 21 current source records, including localized event permalinks, canonical metadata, hreflang, sitemap, RSS and JSON.
- Nine meaningful unit tests pass: source identity, unrelated truncated posts, quoted or corrected claims, lifecycle classification, embed validation, stale/degraded health, deduplication, calendar safety and locale coverage.
- Live browser checks pass for all nine languages at 1440, 768 and 390 CSS pixels. No horizontal overflow, missing images or page exceptions were observed.
- Filters, pagination, timer save/reload/clear, calendar download, FAQ, language switching, event pages and keyboard entry were exercised.
- The personal website's AI collection links to the tracker. A fresh visit opens English. Chinese and Arabic pages and localized event routes return the correct documents on shixilin.com.
- [The manual automation run](https://github.com/shixi-11/codex-respawn/actions/runs/34167816703) completed discovery, source verification, digest generation, data commit, build and deployment. Both discovery pages responded, and X official embeds checked 30 candidates with zero failures at 22:46 UTC on September 7.
- A cloud discovery failure found during launch was addressed by using independent public discovery indexes. Operational health stays separate from announcement state, and the last-known-good data survives failures.
- The cursor uses one complete pixel grid for its outline and color. The header and favicon share the same icon; the README screenshot shows the live implementation.

These checks establish deployment and tested behavior. They do not establish audience size, traffic, revenue, future X availability, exact scheduler timing or a visitor's private quota balance. Visual preference remains subject to the creator's review.
