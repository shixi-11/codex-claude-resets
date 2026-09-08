# Verification

Current scope: next reset, latest relevant source with publication time, last reset. Older history and reset-credit/usage information are collapsed. No notification, calendar, email-subscription or personal-account controls.

- 20 unit tests cover source identity, incomplete evidence, announcement parsing, dates, stale verification and offer expiry.
- Focused Chrome scenarios cover default information hierarchy, removed controls, absence of account URLs in HTML, a sourced countdown, cancellation, latest-post replacement, reset-credit labeling, failed polling, elapsed deadlines, invalid fallback URLs and focus preservation on unchanged refreshes.
- 27 language/viewport combinations pass at 1440, 768 and 390 pixels. History filters, pagination, disclosure controls, language switching, event pages and keyboard navigation pass without page errors, missing images or horizontal overflow.
- The same source validator is used in the build and live-update paths. A malformed fallback post cannot become a clickable source. A previous-reset row cannot be newer than the headline last-reset record.
- Browser and bookmark icons use the existing keycap logo in SVG, PNG and a three-size ICO. Home document titles are short, with Codex & Claude Resets in English and Codex与Claude重置 in simplified Chinese.
- Production checks are reproducible with scripts/qa-migration.mjs and scripts/verify-production.mjs after the deployment has completed.

The page refreshes published records automatically; it does not collect email addresses, store visitor subscriptions or send notifications. Public source records are JSON files in this repository, refreshed by the existing scheduled workflow.
