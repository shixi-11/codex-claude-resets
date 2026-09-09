# Data contract

`events.json` contains source-linked Codex and Claude announcements, newest first. Accepted X authors are `thsottiaux`, `OpenAIDevs`, `OpenAI`, `ClaudeDevs`, `AnthropicAI` and `claudeai`. The author and platform must agree with the source URL.

Each record carries its post ID, source URL, publication and verification times, kind, evidence state, short original-language excerpt, truncation flag, provenance, rules version and source-text hash. `reported` means the author reported completion, not that this site observed a visitor’s balance.

Complete verified records also retain `fullText`; `excerpt` remains the compact summary. Legacy records without complete evidence are not labeled as full text. Translation cache entries bind `fullTexts` to both the exact `fullText` and `contentHash`; pending full translations display the original with an explicit label. Full-text translations never determine reset state or timing.

The collector polls Tibo and ClaudeDevs timelines through FxEmbed. Official X embeds independently verify identity and visible text. A long-post extension is accepted only when the relay author, ID, creation timestamp and text prefix match the official evidence. Such records say `x-oembed+fxembed` and include `relayUrl`; this does not mean X’s embed supplied the complete text. Community websites provide fallback links only. Dynamic text is escaped before rendering.

`platforms.json` contains the latest public reset, grant announcement and Claude promotion terms. Explicit, complete announcements can supply `resetAt`, `sourceTimezone` and `approximate`. PST means UTC−08:00; PDT means UTC−07:00. No silent conversion between the two occurs. Unknown times remain unknown. An elapsed countdown waits for confirmation and never creates a completion event. Public reset times and a visitor’s locally saved account timer remain separate.

`health.json` records actual source attempts and failures. Data older than three hours becomes stale in an already-open browser. Promotion expiry is also evaluated in the browser. A failed promotion check immediately prompts rechecking; it does not refresh the offer’s verification time. A historical grant announcement does not establish that a visitor can claim a credit now.
