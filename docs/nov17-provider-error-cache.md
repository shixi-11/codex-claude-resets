# Local provider-error cache repair — November 17

Base: `584bc1feb09af87980ed45d7c8eb24b4c0f942c0`. Isolated branch: `fix/local-provider-error-cache-nov17`.

The selected executor is available again (Linux, Node v24.22.1, Git 2.52.0). The original `reset-manual-credit-nov11` checkout was read only and remains on `f2181695d8c2e665b915ce1a9ff15ea2f5dcf4a3`. Main and open PRs were checked before work; no overlapping open translation repair was found. No remote writes, permission/configuration changes, installation, production dispatch or live translation requests were performed.

## Evidence and cause

The current cache contained 18 provider-error fields across seven posts: six Japanese excerpt fields and twelve full-text fields. The November 12 Codex activation post `2120999993079451919` had the multilingual obsolete-DeepL-client message in both French and Spanish full text. Its source remains https://x.com/thsottiaux/status/2120999993079451919 and SHA-256 remains `b56e57c3cc846a217eeadf04a1316443c6f2fba996dc3e060f86e209426605e3`.

The translator checked identity, source text, shape and target language, but not provider failure boilerplate. It assigned a full translation before selecting the translated excerpt; an excerpt failure therefore left a partially written full value. A Chinese error sentence contained the Japanese validator's `使用` vocabulary and could itself be accepted as a Japanese excerpt. Existing truthy cache values bypassed requests, and short sources copied the bad excerpt into the full-text cache. The renderer checked source binding and nonempty values but did not reject the cached failure text.

## Narrow repair

- `src/post-text.mjs`: shared detection of known provider failure boilerplate, with no blanket rejection of provider-name mentions. Both excerpt and full-text render paths reject it and use the existing English-original/translation-pending fallback.
- `scripts/translate.mjs`: reject provider failures before either response path; independently sanitize every cached post before any copy or skip path, including history outside the current event list; validate all missing fields before committing them; retain already-valid full translations when requesting a missing excerpt. Failed requests leave good values and provenance timestamps untouched. Sanitization persists even when there are no current events and no requests.
- `data/translations.json`: delete only the 18 confirmed bad fields. Preserve all 2,017 valid fields, source anchors, cache metadata and other languages. No speculative historical replacement was made. The target French/Spanish full posts explicitly fall back to the English original until a valid version-bound translation is available.
- One regression-test module and this local handoff note. Source paragraph-break handling is unchanged.

## Validation

- Focused tests: **20/20 passed** (`post-text`, Day26, small-ship and provider-error-cache suites).
- Full suite: **245/245 passed**, zero failed, skipped or cancelled tests (`node --test`).
- Nine-language current-data build passed: **170 events, 1,154 indexable pages** (`node scripts/build.mjs`).
- Scanned all **1,540 generated HTML files** for the known provider-error signatures: none remained. Current French/Spanish event details contain the English original, correct official source and explicit translation-pending label.
- A real small nine-language build with deliberately poisoned legacy cache confirms renderer protection independently of cache cleanup. Mocked real-translator subprocesses cover short-copy and already-present skip cases, no-current-event history, partial validation failure, retained good full text, repeated failures, successful French/Spanish filling, and subsequent no-request preservation.
- Scope audit proves the working cache equals the base cache with exactly those 18 fields deleted. Official events, states, original text/hashes, platform clocks, health, topic-heat data and both workflows are byte-for-byte unchanged. Whitespace validation passes.

The detector recognizes known failure messages; it is not a general translation-quality judge. Ordinary references to DeepL remain allowed. Tests make no live upstream requests and do not certify provider recovery. This is a local deliverable, not a published fix. Publication needs separate authorization, reconciliation with any newer main/cache data, normal PR checks and actual deployed French/Spanish fallback verification. The original source and valid translations must continue to be preserved; no alert or scheduling change belongs in this repair.
