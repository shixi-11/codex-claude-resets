# October 28 collection reliability repair

## Distinct failures

[Run 40749010182](https://github.com/shixi-11/codex-claude-resets/actions/runs/40749010182) was created at 18:51:34 UTC. Its [saved health at 78b998e](https://github.com/shixi-11/codex-claude-resets/blob/78b998e93ff0b684507a6bc7a8c4ffcaaa7f2a9d/data/health.json) reports an OpenAIDevs timeline HTTP 404; the other five timelines and eight primary embed checks succeeded. Codex and overall health remained degraded with last success 12:50:14.203 UTC. Both 145-test passes, build and record publication succeeded; the final newly detected tracking-issues alert failed as intended. Deployment success is distinct from complete source coverage.

The preceding [run 40691093423](https://github.com/shixi-11/codex-claude-resets/actions/runs/40691093423) was created at 12:50:02 UTC. There was no intervening created run in the inspected Actions history. Audit timestamps were 12:50:54.916 and 18:52:40.654 UTC: 21,705,738 ms (6 h 1 m 45.738 s) apart. This is a scheduled-run creation gap, not a six-hour collector or runner queue. The available history does not establish GitHub's internal reason. The hourly schedule, three-hour gap threshold and existing alert remain intact. [GitHub documents delayed/dropped schedule events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule); this repository cannot guarantee scheduler delivery without independently configured infrastructure.

The exact failing OpenAIDevs URL returned HTTP 200 with matching posts at 19:07 UTC. This supports intermittent upstream availability, not deletion of the official account or a proven cache cause. No endpoint variants, access restrictions, credentials, paid services or API modes were changed. A stored 404 alone cannot establish a missed official reset post.

## Repository defects and repair

1. A first stalled fetch previously received the entire remaining request deadline. Its timeout left no time for the documented retry. Divide remaining time among remaining attempts so a stalled first response can abort and retry while retaining the same 18-second request and 120-second collection deadlines. Earlier first-attempt cancellation is the deliberate tradeoff; retries still stop when the shared budget runs out.
2. Timeline validation previously occurred after the transport retry loop. HTTP 200 with an application error, malformed JSON, empty results, or no matching allowed author failed immediately. Move validation into the existing bounded three-attempt timeline request. Only a valid matching-author result can count as coverage. The [upstream API documentation](https://docs.fxembed.com/api/introduction/#response-format) explicitly notes application codes can indicate errors inside HTTP 200 responses.
3. Record each timeline attempt in engineering health JSON, including attempt number, assigned timeout, HTTP status where available, validation/transport error, outcome and elapsed wall time (including any backoff). A later valid response can establish recovery without erasing the earlier attempts. Exhaustion preserves the source failure and prior successful-check timestamps.

No retries are added for 401/403 or individual-post 404s. Long Retry-After values are respected by stopping this bounded request, never by retrying early. Existing identity/text/time verification, classification, evidence retention, per-author fallback bounds, staleness, scheduling and alert policy are unchanged. No data records or frontend assets are changed by this PR. This infrastructure repair awaits specific merge authorization.

## Validation and boundaries

The full local suite passes 149 tests; the build produces nine locales, 153 events and 1,386 pages. Diff whitespace checks pass.

Regression tests exercise a genuinely hung abortable transport followed by success, malformed/application-error responses, wrong-author and empty timelines, three-attempt exhaustion, non-retried 403, long Retry-After, shared-budget exhaustion and the actual collector's recovered/degraded health transitions. Historical completion text, publication/verification timestamps, plan scope and exact-time absence remain unchanged. A regression reproduces the exact October 28 audit gap even when current source coverage recovers.

An isolated live copy collected at `2026-10-28T19:10:53.675Z` with all six timelines successful and zero primary-check failures. Each timeline succeeded on its first attempt; retry recovery is proven by the controlled regressions, not claimed from that live run. The original completion text, quote of 2115273253711409208 and parent 2115273064481218829 were independently rechecked by official embeds. Completion remains the official report at October 28 06:29:38 UTC, with no backend execution timestamp or eligible-plan guarantee. No isolated output was copied into production data.

This fixes two demonstrable local reliability defects. It cannot force a persistently unavailable upstream to return posts or force GitHub to create a scheduled run. Such failures must continue to publish truthful degraded health and remain visible in the audit. A local successful scan does not make production healthy; production still served the 18:51 degraded attempt during this investigation. Merge, deployment and production verification of this change remain pending.
