# Reset tracking checks

The collector and builder derive platform summaries from the same verified event records. Both check the source, publication time, verification time, classification, content hash and countdown of those summaries before saving or publishing them.

`node scripts/audit-tracking.mjs` creates an internal report in `output/tracking-audit.json`. It includes incomplete author coverage, stale successful checks, gaps over three hours, recent unconfirmed official reset wording and overdue announcements without a later completion. GitHub Actions uploads this report and adds a job summary. Neither the report nor the review queue is copied to the website.

New issues fail the final workflow step **after** collected evidence and the deduplication state have been saved. Existing open issues remain visible in subsequent summaries without repeatedly failing the workflow. A resolved issue is removed from the saved keys; recurrence or changed source content alerts again. GitHub's account notification settings control whether workflow failures produce email or app notifications.

Review an unresolved original through its source link. Confirm the full text and author, distinguish a planned reset, applied reset and banked reset credit, then update conservative classification rules with positive and negative regression cases. Reclassify the stored full evidence and verify both summary and offer sources before pushing. Unknown wording is escalated for review, not automatically confirmed by a language model. No paid API is enabled.

EOD establishes an announced deadline but not an exact timezone or instant. It must not create a fabricated countdown. Relative dates with explicit offsets are interpreted in the author's source timezone.

The workflow cannot alert while GitHub itself is not running scheduled jobs. A delayed run detects the gap on its next execution. Source failures retain the last known evidence; alerts do not guarantee that an unavailable external timeline can be read.
