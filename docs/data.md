# Data contract

`events.json` contains source-linked Codex and Claude announcements, newest first. Accepted X authors are `thsottiaux`, `OpenAIDevs`, `OpenAI`, `ClaudeDevs`, `AnthropicAI` and `claudeai`. The author and platform must agree with the source URL.

Each record carries its post ID, source URL, publication and verification times, kind, evidence state, short original-language excerpt, truncation flag, provenance, rules version and source-text hash. `reported` means the author reported completion, not that this site observed a visitor’s balance.

Complete verified records also retain `fullText`; `excerpt` remains the compact summary. Legacy records without complete evidence are not labeled as full text. Translation cache entries bind `fullTexts` to both the exact `fullText` and `contentHash`; pending full translations display the original with an explicit label. Full-text translations never determine reset state or timing.

The collector polls all six allowlisted author timelines through FxEmbed. Official X embeds independently verify identity and visible text. A long-post extension is accepted only when the relay author, ID, creation timestamp and text prefix match the official evidence. Such records say `x-oembed+fxembed` and include `relayUrl`; this does not mean X’s embed supplied the complete text. Community websites provide fallback links only. Dynamic text is escaped before rendering.

`platforms.json` contains the latest public reset, grant announcement and Claude promotion terms. Explicit, complete announcements can supply `resetAt`, `sourceTimezone` and `approximate`. PST means UTC−08:00; PDT means UTC−07:00. No silent conversion between the two occurs. Unknown times remain unknown. An elapsed countdown waits for confirmation and never creates a completion event. Public reset times and a visitor’s locally saved account timer remain separate.

`health.json` records actual source attempts and failures. Data older than three hours becomes stale in an already-open browser. Promotion expiry is also evaluated in the browser. A failed promotion check immediately prompts rechecking; it does not refresh the offer’s verification time. A historical grant announcement does not establish that a visitor can claim a credit now.


## Collection and classification rules

1. **Discover separately.** Poll all six allowlisted author timelines, up to 40 recent posts per author per run. Replies are included. This is a bounded recent-post scan, not an exhaustive archive or a promise that every post is discoverable. Public community pages provide fallback links only.
2. **Verify original evidence.** X embeds must match author and post ID. Relay full text must corroborate the official excerpt and timestamp. Relay discovery keywords do not establish relevance or completion. API access remains opt-in with explicit paid-API enablement.
3. **Decide relevance first.** Include allowance resets, reset credits and subscription allowance information. Generic usage/adoption, model retirement, password resets and capability limits are excluded. Tibo’s short reset replies may remain unconfirmed signals; they do not establish a completed reset.
4. **Separate claim states.** An explicit future commitment is announced; an explicit first-person completion is reported; ambiguous, conditional, quoted or incomplete evidence remains unconfirmed. Replacement credits are distinct from a global reset. Rules are deterministic and conservative, not a guarantee of perfect semantic classification.
5. **Reconcile history.** Every run reclassifies complete stored text with the current rules, removing unrelated records from events, cards and feeds. An independently checked complete unrelated post can supersede a previous false positive. Network failures and shorter evidence cannot erase complete records. Content hashes and source verification times remain unchanged during local reclassification.
6. **Compute each platform’s health.** All configured timelines must succeed, and relevant candidate evidence checks must have no failures. Only then does that platform’s successful-check timestamp advance. A successful timeline scan with zero relevant candidates is healthy; discovering a fallback link alone is insufficient. The overall status is healthy only if both platforms are healthy. Each platform becomes stale after three hours without success.
7. **Display without inference.** Latest related publication, last reported completed reset and scheduled next reset are separate. No explicit time means no countdown. Passing the scheduled time does not confirm completion. The seven-day feed includes the latest post and sorts by original publication time. Public completion claims cannot establish any individual account’s state.
8. **Keep translation downstream.** Classification uses verified original text. Translations are bound to content hashes and preserve original paragraphs; missing translations display the original.

The homepage presents the scope and update cadence in all nine languages. Detailed source outcomes and independent platform health are exposed in `health.json`. Git history records corrections. The scheduled workflow checks twice hourly, but scheduler or upstream delays are possible.
