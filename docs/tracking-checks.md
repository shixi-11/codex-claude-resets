# Reset tracking checks

The collector and builder derive platform summaries from the same verified event records. Both check the source, publication time, verification time, classification, content hash and countdown of those summaries before saving or publishing them.

`node scripts/audit-tracking.mjs` creates an internal report in `output/tracking-audit.json`. It includes incomplete author coverage, stale successful checks, gaps over three hours, recent unconfirmed official reset wording and overdue announcements without a later completion. GitHub Actions uploads this report and adds a job summary. Neither the report nor the review queue is copied to the website.

New issues fail the final workflow step **after** collected evidence and the deduplication state have been saved. Existing open issues remain visible in subsequent summaries without repeatedly failing the workflow. A resolved issue is removed from the saved keys; recurrence or changed source content alerts again. GitHub's account notification settings control whether workflow failures produce email or app notifications.

Review an unresolved original through its source link. Confirm the full text and author, distinguish a planned reset, applied reset and banked reset credit, then update conservative classification rules with positive and negative regression cases. Reclassify the stored full evidence and verify both summary and offer sources before pushing. Unknown wording is escalated for review, not automatically confirmed by a language model. No paid API is enabled.

Bare EOD establishes a deadline without an explicit timezone or instant. An EOD PST announcement retains the literal PST wording while leaving resetAt unset; it does not create a guaranteed execution time or countdown. Relative dates with explicit offsets are interpreted in the author's source timezone.

The October 13 rhetorical completion wording requires a recent, independently verified same-author quoted global announcement. Its original text, timestamp and hash are stored as resetContext; the quoted relationship is corroborated through FxEmbed alongside the official originals. A bare "It's done" or an unverified, mismatched, future or old quote cannot establish completion. Network failure retains previously verified matching context without refreshing that context's verification timestamp.

Transient network/HTTP read errors have at most one short retry within the original 18-second request budget. A complete collection has a two-minute budget and saves verified records with degraded coverage if that budget is exhausted. Permanent failures and long Retry-After values are not retried. For already known official sources, `node scripts/collect-posts.mjs <source-url> ...` verifies and reconciles explicit links without modifying timeline health or claiming a new full coverage check. Neither manual source selection nor elapsed time determines completion.

The workflow cannot alert while GitHub itself is not running scheduled jobs. A delayed run detects the gap on its next execution. Source failures retain the last known evidence; alerts do not guarantee that an unavailable external timeline can be read.
