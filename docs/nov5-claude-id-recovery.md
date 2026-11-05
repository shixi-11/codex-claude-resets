# November 5: bounded ClaudeDevs timeline recovery

## Failure and primary evidence

Run [42004112555](https://github.com/shixi-11/codex-claude-resets/actions/runs/42004112555) passed 179 tests and the nine-language build, then published degraded Claude coverage because the ClaudeDevs handle timeline returned HTTP 404. The last complete Claude check remained 2026-11-05T02:25:55.414Z. The final tracking alert failed the job after publication; successful individual embeds did not establish full timeline coverage.

At 10:39 UTC the handle still failed, including the existing bounded retry. The public [profile](https://api.fxtwitter.com/ClaudeDevs) and [post detail](https://api.fxtwitter.com/ClaudeDevs/status/2118063143167693011) consistently identified ClaudeDevs as 2024518793679294464. The [ID timeline](https://api.fxtwitter.com/2/profile/id:2024518793679294464/statuses?count=40&with_replies=1) returned 16 direct own posts, plus a context row. X official embeds independently confirmed the handle and text of the [latest root post](https://x.com/ClaudeDevs/status/2118063143167693011), its [follow-up](https://x.com/ClaudeDevs/status/2118063144572772627), and the [retained explicit reset completion](https://x.com/ClaudeDevs/status/2094856679250919746). The numeric ID is a public-relay pin, not authenticated X API identity certification.

[FxEmbed's API reference](https://docs.fxembed.com/api/twitter/operations/2profilehandlestatuses/) supports a numeric ID in the handle path and preserving the same count/reply parameters. This provides an alternate lookup, not a guarantee against every upstream outage.

## Narrow repair and trust boundary

Only canonical ClaudeDevs joins the existing Tibo fallback. A handle HTTP or payload 404 switches remaining requests to that author's pinned ID. Tibo's pin and behavior stay unchanged. AnthropicAI, claudeai, OpenAI and OpenAIDevs retain their existing handle-only requests. The classifier, frontend, schedules, alert thresholds, publication times, plan claims and other review items are unchanged.

The same maximum three requests share the 18-second author budget and the collector's remaining 120-second global budget. Retry waits and request timeouts stay within that budget. Retry-After is respected. Authentication errors stop, and non-404 retryable failures do not select the ID path.

An ID response establishes coverage only through direct own root posts with the expected ID, case-insensitive handle, public status, matching post URL and post ID. Conflicting identities, missing IDs, empty or malformed results and quote-only matches fail closed. Other authors and their quoted posts cannot supply coverage. Official embed verification still runs independently before an event is accepted. Actual request paths and outcomes are recorded in health; failure retains the prior success timestamp.

## Validation before release

- All 187 Node tests passed; build produced nine locales, 162 events and 1,467 pages.
- Focused tests cover handle success, HTTP/payload 404 recovery, mixed-case identity, foreign thread context, wrong/missing/conflicting IDs, URL mismatch, protected/empty/quote-only responses, retry limits, Retry-After, hanging requests, and exhausted budgets.
- Real-collector fixtures cover total failure, ClaudeDevs ID success while AnthropicAI remains unavailable, complete recovery and a repeated successful run. Retained verified evidence is unchanged and usage information does not become a reset completion.
- An independent focused review passed 20 tests with no blocking findings.
- An isolated live collector at 2026-11-05T10:44:02.960Z naturally encountered handle 404s for both Tibo and ClaudeDevs and recovered through their respective IDs. All six timelines and nine official embeds succeeded. This was a live isolated validation, not a production deployment. Its 162 events retained the same IDs, classification, source publication times, reset times, plan fields and full text. No isolated data was copied into the repository.

After normal merge, verify the exact main workflow and production data, inspect the live EN/ZH desktop/mobile pages, capture the deployed page into docs/screenshot.jpg, and pin README to that image commit as required by AGENTS.md. Do not bypass branch protection or suppress coverage/staleness alerts to obtain a green result.
