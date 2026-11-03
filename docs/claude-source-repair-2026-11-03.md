# Claude collection repair, November 3, 2026

## Observed failure and primary sources

[Run 41687997081 / job 126098767300](https://github.com/shixi-11/codex-claude-resets/actions/runs/41687997081/job/126098767300) passed 164 tests and the build. Its final tracking-alert step failed after saving the source records. The committed `health.json` records HTTP 404 from the `ClaudeDevs` and `AnthropicAI` FxEmbed timelines; `claudeai` and all three Codex timelines succeeded. The last complete Claude check remained `2026-11-03T09:43:54.881Z`. Successful individual official embeds and community link discovery did not repair missing timeline coverage.

The exact failing addresses are:

- `https://api.fxtwitter.com/2/profile/ClaudeDevs/statuses?count=40&with_replies=1`
- `https://api.fxtwitter.com/2/profile/AnthropicAI/statuses?count=40&with_replies=1`

Both returned valid HTTP 200 timelines during this investigation. There is no evidence of a permanent account/URL change or a proven cache cause. The [current FxEmbed reference](https://docs.fxembed.com/api/twitter/operations/2profilehandlestatuses/) documents these endpoints, including replies. Existing bounded retries and the full-author health requirement remain; removing replies, accepting community indexes or checking a single post would not establish the same coverage. An upstream outage can recur.

The separate promotion check failed because the [official help article](https://support.claude.com/en/articles/15910845-claude-code-may-august-2026-weekly-limits-promotion) now includes Ultra in the September 14 permanent +25% sentence. The historical +50% promotion elsewhere in that article retains its earlier plan list. The old exact eligibility expression therefore rejected a real update. The [official October 30 announcement](https://x.com/claudeai/status/2116220869479428500) also records the Max 20x to Ultra name change; it is already stored in the repository and is not a new reset completion.

## Repair

- Accept only the two reviewed plan lists in the complete current September 14 +25% sentence, and derive structured eligibility from that sentence. Changes to percentage, date, product, unsupported plans, or the required unchanged five-hour/automatic-application terms still fail for review.
- Render the verified plan list in the existing nine-language offer component, retaining translated Enterprise terminology and compatibility with older records. No layout change.
- Verify official terms on main pushes as well as scheduled/manual runs, so a merged parser repair receives a fresh primary check before records are published.
- Add a real-collector regression for these two failed authors: a successful primary post does not advance complete coverage; a subsequent successful scan of all accounts does. Existing records, timestamps and completion semantics are preserved.

No data files, monitoring state, reset classifications, source publication times, translations, scheduler frequency, old PRs or unrelated projects are changed by this source-only PR. The existing unrelated Codex review item for `2115851621137784832` remains open.

## Validation evidence

- 168 Node tests passed on both checked-in records and a separate fresh live collection. The nine-language build produced 161 events and 1,458 pages with each dataset.
- Isolated live scan started at `2026-11-03T18:18:58.543Z`: all six timelines succeeded, with 20 / 11 / 13 / 14 / 18 / 14 accepted candidates respectively. Ten official embed checks succeeded with zero failures. Both platform coverage states and overall collection state were `ok`.
- Official promotion fetch at `2026-11-03T18:19:11.926Z` produced `promotionHealth.state=fresh` and `Pro, Max, Ultra, Team, seat-based Enterprise`. Effective date and permanent +25% benefit remained unchanged.
- Audit of this isolated dataset produced zero new alerts and one pending review, the existing unrelated Codex item. This is independent live evidence, not production publication and not proof of permanent upstream availability.
- Syntax and whitespace checks passed. Browser validation and screenshots are retained locally with the isolated live build; final production validation remains a release step.

Local evidence directory: `F:\CodexData\Temp\claude-repair-nov3-live` (`data/health.json`, `data/platforms.json`, `output/tracking-audit.json`, `validation-tests.log`, `browser-checks.json`, `desktop.png`, `mobile.png`). These isolated data are not copied into production or committed.

## Normal merge and release checks

This repair is submitted as a draft against the latest main and must follow the repository's normal CI, human review and protection requirements. No approval, merge, workflow dispatch or deployment is performed by this repair task.

After normal merge, inspect the exact main workflow and its bot-authored record commit, then the corresponding Vercel production deployment. A successful build alone is insufficient. At `https://shixilin.com/ai/codex-claude-resets/`, check:

1. `health.json`: all configured authors, including both previously failing Claude timelines, succeeded; platform status is `ok` and last-success time comes from this actual full scan. If a source fails again, retain its degraded status and diagnose it.
2. `platforms.json`: the official promotion check is fresh and its eligibility contains Ultra from the current permanent sentence. Source publication dates, September 14 effective date, and official completion evidence remain distinct.
3. English and Chinese desktop/mobile pages: current check time, source links, plan labels and unchanged layout; no browser errors or overflow. Check the other locale plan labels if this offer is displayed.
4. The unrelated Codex review entry must not be removed just to produce an empty queue. The historical schedule gap remains recorded in the original audit.
5. Follow `AGENTS.md`: capture the final current production page, update `docs/screenshot.jpg`, pin the README image URL to its actual image commit, and verify that published URL. A local test screenshot is not a production screenshot.
