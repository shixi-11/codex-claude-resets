# Current terms publication guards

Follow-up to PR #54 findings 4459357438 and 4459357453. No other active repair PR was present when work started from main a1ac095.

The official help article was freshly fetched at 2026-11-03T20:22:37.899Z. Its entire current paragraph starts with the historical promotion introduction, then the permanent September 14 +25% statement and Ultra plan list. No new regional restriction was observed. Unknown regional/eligibility prefixes used in tests are synthetic counterexamples, not claims about an official change.

The parser now anchors the entire reviewed paragraph, including its actual introduction. Truncated suffix fixtures were replaced with the full source paragraph. Both unrecognized prefixes and inserted conditions are rejected even when the familiar permanent-offer sentence follows.

A publication projection removes unsupported current assertions from stale permanent-offer snapshots at build and browser hydration/refresh boundaries. It covers the actual old scope text as well as claim and additional obsolete fields. It preserves verification times and source URLs and does not mark stale evidence fresh. Historical promotions, unrelated messages and original source prose are retained.

The build regression seeds a stale snapshot, invokes the real build, and inspects dist/platforms.json and every page-data payload across all generated pages. It also checks unchanged input records, source dates, health and historical promotion data. The live official page passes the stricter parser. Production release, final page checks and a newly pinned README screenshot follow the normal verified merge.

## Production validation

PR #55 merged normally as a8e492fdd7366a1f47708505ed7b1605643987d6 after CI run 41712209999 passed 174 tests and the build. Automated review found only the screenshot follow-up, completed with the actual production capture below; no GitHub approval or protection bypass was used.

The first production run 41712866948 passed the strict official terms check but correctly retained degraded AnthropicAI timeline HTTP 404 coverage. One fresh existing-workflow run, 41713381533, succeeded with all six accounts and ten official embed checks. Its data commit is acdc2b15f934bff43f4bda04e5d06ab85adf3113, complete check time 2026-11-03T20:32:26.080Z and official promotion verification 20:32:36.438Z. Vercel production deployment AiqiVpy1ay3dmpPvpTUSEsDAycfK succeeded. The unrelated Codex review item remains. Upstream availability is not guaranteed by this successful scan.

Public platforms.json and the nine locale page-data payloads were checked at 20:32:12.988Z for supported fields only. Actual production English/Chinese pages at 1440 and 390 pixels were checked at 2026-11-03T20:35:17.004Z against the newly deployed full-coverage data: no page errors, missing images, overflow or health warning; source links and real successful-check time matched. Chrome rendered unmodified production responses fetched through the working Node network proxy. docs/screenshot.jpg is the new full-page production capture; README pins its exact image commit. Local detailed evidence is in .qa/production-verification.json and .qa/published-data-verification.json.
