# Classification synchronization repair — 2026-10-07

Prepared from main e3a6cfe in an isolated Mac checkout. No previous Windows fix commits were imported. No push, merge, deployment or network/proxy configuration change was performed.

## Findings

- Collection had already stored the complete October 7 announcement (2107676072871600470), official embed corroborated with FxEmbed. Thus this record's stale category was not a discovery failure. The classifier recognized completed/propagated but omitted “processed”; its general completion branch also required scope keywords absent from this short announcement. It consequently remained a signal and was omitted by the summary selector.
- Collection computed latestReset/lastReset, while build only hydrated whatever IDs platforms.json already contained. Updating classification alone could leave the top summary behind. Both stages now derive summaries from the same classified records; build reclassifies complete stored evidence without requiring a successful network collection.
- Latest stored check: 08:53:47.544 UTC. OpenAIDevs timeline returned 404; seven post checks failed. Codex and aggregate health remain degraded. Aggregate lastSuccessAt remains 02:16:54.145 UTC. Reclassification preserves source verification times and does not pretend to perform a new check.
- Deployment is a separate gate: Actions collects and commits data; Vercel builds the committed snapshot; the main domain proxies that deployment. A ten-minute schedule is not a guaranteed publication deadline. A ready deployment and matching public JSON must be verified after release. This task has not established a new ready deployment or investigated Vercel runtime logs, so no additional deployment fault is claimed.

## Changes

- Versioned author-scoped explicit processed/applied/completed/propagated completion rule. Existing negative, conditional, quoted and truncated guards still apply. No post ID is hard-coded in production classification.
- Shared platform-state derivation used in collector and builder, sorted by publication time. Builder reclassifies full evidence and regenerates JSON and all locale pages.
- Regenerated stored events and summaries without touching health or evidence timestamps. The October 3 Pro 500 report remains a separate unconfirmed record; no compensation, account receipt or all-plan eligibility is inferred.
- Actions reruns tests after data collection/translation, before building and saving records.

## Verification

62 Node tests passed, including processed variants, negative/conditional/quoted/truncated controls, stale-summary convergence, preserved evidence timestamps and independent Pro 500 report. Build produced 9 locales, 118 records and 1,071 pages. Built Chinese/English detail HTML has the reported badge; built platforms.json selects October 7 as latest/last completion; health.json remains degraded. No new live collection was performed.

## Release actions awaiting authorization

1. Review and commit this checkout's diff on a new branch; push only with explicit authorization for this task. Do not retry the rejected Windows branch push.
2. Review/merge and run the refresh workflow; inspect per-source health without promoting partial coverage to full verification.
3. Confirm Vercel's production deployment contains the accepted commit; compare public events.json, platforms.json and health.json at both origin and main-domain route with the built snapshot.
4. Check Chinese/English detail and top summary in the actual browser, including the independent Pro 500 text; capture a fresh docs/screenshot.jpg and update README's commit-pinned raw image per AGENTS.md. Screenshot and production validation remain pending because publication was expressly excluded here.
