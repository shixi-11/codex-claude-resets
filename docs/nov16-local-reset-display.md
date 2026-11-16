# Official reset display — local handoff, November 16

Base: `64a111047ca7f9767944be7b29f769dfd9c44646` (main rechecked before handoff).
Local branch: `fix/local-official-reset-display-nov16`.

The previous `reset-display-recovery-nov13` checkout and local commit `eba523c130bcaa6bb1ac4e63e251f2e9f18cc9e4` were absent from the selected environment. This is a minimal reconstruction, not a recovered copy of that commit. The older manual-grant checkout and commit `f2181695d8c2e665b915ce1a9ff15ea2f5dcf4a3` remain unchanged. Its two source files and manual-grant regressions were the recoverable starting point; the activation behavior was reconstructed from the earlier task record and freshly checked primary evidence.

## Sources checked again on November 16

- https://x.com/ClaudeDevs/status/2120275296637321476 — official X oEmbed and syndication identify ClaudeDevs, November 10 publication, one free full reset across all models/limits for Pro, Max, Ultra and Team, and the deadline before December 10 at 14:00 PT. December 10 is Pacific standard time (UTC−08:00): the cutoff is **2026-12-10T22:00:00Z**, or December 11 at 06:00 in Shanghai. This is a manual redemption deadline, not an automatic quota reset. The original does not establish whether an individual has used the credit. Official responses truncate the later explanation; the relay raw text is accepted only after the existing author, post ID, publication-time and visible-prefix corroboration. The complete source hash remains `cbc827f7ed501e02460819e2e6a33e2d8ee3bd9b4e2590162b5fcf4f3ece6208`.
- https://x.com/thsottiaux/status/2120999993079451919 — the complete official oEmbed and syndication text confirm activation and expected later arrival in accounts. They do not confirm delivery to every account. Hash remains `b56e57c3cc846a217eeadf04a1316443c6f2fba996dc3e060f86e209426605e3`.

The checked source representations are retained in two small fixtures, with unused relay metadata removed. The direct X pages returned HTTP 403 through web fetch; the official oEmbed and syndication endpoints returned HTTP 200. No signed-in account or paid API was used.

## Exact implementation scope

- `src/evidence.mjs`: exact complete-source classification for the manual grant (`banked / reported`) and activation (`banked / announced`, reason `reviewed-bank-rollout`); guards reject changed or truncated reviewed claims. Rules version 1.4.30.
- `src/credit-availability.mjs`: nine-language manual qualification, local-time cutoff and exact expiry; activation labels say `Activated · delivery pending` with no global receipt claim. Original `announced` styling is retained. Already-open views use the existing expiry refresh path.
- `data/events.json`: only the two source records change, and only kind/state/reason/rulesVersion as applicable. All 170 records, text, hashes and verification timestamps are retained.
- `data/platforms.json`: derived latest/latestGift pointers use the corrected records. Both platforms' automatic reset clocks, latest global resets, historical completions, gifts and source-health fields remain unchanged.
- Two test modules, two source fixtures and this handoff document.

No generic latest-news selection rewrite, archive-window extension, DeepL/cache cleanup, translation-cache changes, CSS, screenshot/README replacement, schedule, workflow, permission or unrelated PR change is included. The existing all-history current-card selection already keeps the corrected manual grant independently of the seven-day feed. A new general classification for future grants is outside this exact-source repair.

## Verification

- **237/237 complete Node tests pass**, zero failures, skipped or cancelled tests (`node --test`).
- Current-data nine-language build passes: **170 events, 1,158 indexable pages** (`node scripts/build.mjs`).
- Three additional real small nine-language builds cover November 18 after archive removal, the millisecond before expiry, and the exact expiry; every homepage/current-card pair, manual-grant detail page, exported platform JSON and RSS state is checked. The old September credit and real global completion records remain in the test input.
- The seven-day archive includes the post through **2026-11-17T21:59:58.185Z**, and excludes it one millisecond later. Current manual-grant cards remain visible and date-limited until **2026-12-10T22:00:00Z**, then display expired. No resetAt, countdown or automatic completion is introduced.
- Exact source/plan/deadline changes, truncated evidence, local-time mappings, open-view expiry and repeated targeted/timeline collection with controlled source responses are covered.
- Structural scope audit confirms only the two event records change; automatic clocks/history, translations, health, workflows, permissions and styling remain unchanged. Whitespace validation passes.

The local preparation above performed no remote write. On November 16 the user explicitly authorized resuming the dedicated repair PR and normal merge after verification. Publication follows the ordinary GitHub tools, exact-head CI, preview inspection and production checks; no branch protection, permission or workflow bypass is authorized. The repository screenshot rule applies to the resulting website update.
