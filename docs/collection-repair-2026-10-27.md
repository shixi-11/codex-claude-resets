# October 27 collection degradation

## Findings

Production run [40574842206](https://github.com/shixi-11/codex-claude-resets/actions/runs/40574842206) started at 20:05 UTC. Its saved health reports HTTP 404 for the Tibo and claudeai FxEmbed timelines, 513 successful embed reads and nine failed embed reads. The last complete collection remained 14:29:12.417 UTC. Tests and build succeeded; the final new-tracking-problem alert failed the workflow. There is no evidence here of a missed official reset announcement.

The timeline request already retries monitored 404s three times within the existing request and collection deadlines (commit 191e6d7). Direct public reads during this investigation returned HTTP 200 for both accounts. The evidence supports an intermittent upstream timeline failure; it does not establish the relay's internal cause. No endpoint, credential, paid adapter or security protection was changed.

The local fallback path amplified that outage: it accepted entire community archives (454, 68 and 30 links in this run), then used last-write-wins deduplication. URL-only duplicates replaced timeline candidates and discarded their relay text. This forced unnecessary official embed requests for unrelated and historical posts. At least the failed post 2114228445043691592 has a valid official embed containing only a media link and no textual body; it is not evidence of a reset. Unavailable or empty evidence must remain a failed verification, not an invented claim or successful check.

## Repair

Keep timeline and explicitly requested candidates, preserving available relay/full-text fields on duplicate IDs. For community discovery, take at most the newest 40 unique links per author whose timeline was unavailable. Successful timelines already supply that author's bounded discovery, so community archives cannot expand it. Explicit URLs and the existing incomplete-record rechecks retain their separate paths. This bounds outage amplification; it cannot guarantee upstream availability or exhaustive discovery.

All timeline errors, selected-post verification failures, previous complete records and successful-check timestamp rules remain intact. Community discovery cannot establish healthy timeline coverage. No production data, classification rule, frontend or screenshot changes are part of this repair. A read-only PR workflow runs tests and build without collection or publication.

## Primary-source review

- [Day21](https://x.com/thsottiaux/status/2114588174249071102): published October 26 05:21:22 UTC (13:21:22 Beijing), announces a reset. It supplies no reset instant, completion or eligible-plan guarantee.
- [Day22](https://x.com/thsottiaux/status/2114800277677092936): published October 26 19:24:11 UTC (October 27 03:24:11 Beijing), describes Terra and 2X more usage than 6.1 Sol across API and subscriptions. It is usage information, not completion of Day21, and adds no reset execution time or individual receipt guarantee. Both posts' official X embeds were independently retrieved and compared with relay identity, text and timestamp. Neither post names a reset-plan exception or a source reset timezone; none is inferred. Existing plan-specific and PST/PDT rules remain unchanged.

The current classifier excludes this Day22 wording as `other`; the live scan independently read it without inserting it into the allowance feed. This repair does not broaden usage classification. Its regression protects the reset-state boundary and does not claim this usage post was published as a feed event.

## Validation

Regression tests cover mixed-author archives, duplicate evidence preservation, successful-author exclusion, explicit rechecks, and an actual collector run with persistent Tibo/claudeai 404s plus 2,724 archive links. That run makes only 80 fallback embed attempts, retains all 80 failures, keeps both platforms degraded, preserves the 14:29 successful-check time and the stored Day21 evidence, and never invents completion.

An isolated live copy completed at 22:04 UTC with all six timelines successful and no failed evidence checks. Its successful-check timestamp is `2026-10-27T22:04:34.604Z`. Its output was not copied into tracked production data. Local full-suite tests and the nine-language build are recorded in the PR; upstream recovery during this check does not guarantee future availability. Merge and production validation remain pending explicit authorization for this infrastructure repair.
