# Verification

Current scope: next reset, latest relevant source with publication time, last reset. Older history and reset-credit/usage information are expanded by default. No notification, calendar, email-subscription or personal-account controls.

- 25 unit tests cover source identity, incomplete evidence, announcement parsing, dates, stale verification, offer expiry, source-bound translations, wrong-language responses, product-name loss, terminology failures and escaped markup.
- Focused Chrome scenarios cover default expanded information hierarchy, removed controls, absence of account URLs in HTML, a sourced countdown, cancellation, latest-post replacement, reset-credit labeling, failed polling, elapsed deadlines, invalid fallback URLs and focus preservation on unchanged refreshes.
- 27 language/viewport combinations are checked at 1440, 768 and 390 pixels. The single platform filter, pagination, disclosure controls, language switching, event pages and keyboard navigation are checked for page errors, missing images and horizontal overflow.
- `scripts/qa-visitor.mjs` verifies translated news, source-version fallback, translation replacement during live updates, preserved platform selection, one filter group, unchanged last-success timestamps during outages, and the simplified footer.
- The same source validator is used in the build and live-update paths. A malformed fallback post cannot become a clickable source. A previous-reset row cannot be newer than the headline last-reset record.
- Browser and bookmark icons use the existing keycap logo in SVG, PNG and a three-size ICO. Home document titles are short, with Codex & Claude Resets in English and Codex与Claude重置 in simplified Chinese.
- Production checks are reproducible with scripts/qa-migration.mjs and scripts/verify-production.mjs after the deployment has completed.

The page refreshes published records automatically; it does not collect email addresses, store visitor subscriptions or send notifications. Public source records are JSON files in this repository, refreshed by the existing scheduled workflow.

Current visitor-facing changes remove category filters, duplicate archive headings, the long definitions paragraph, footer disclaimers and technical feed links. Credit and extra-usage cards keep their separate meaning, eligibility, method, dates and source. All content disclosures remain open by default and use chevrons. The backend's last successful check is distinct from a browser fetch time.
