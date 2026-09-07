# Data contract

`events.json` is an array sorted by publication time, newest first. IDs are X post IDs. `sourceUrl` must be an HTTPS post URL for `thsottiaux`, `OpenAIDevs` or `OpenAI` on x.com or twitter.com.

| Field | Meaning |
| --- | --- |
| `kind` | `global`, `banked`, `usage`, or `signal` |
| `state` | `announced`, `reported`, `information`, or `unconfirmed` |
| `publishedAt` | UTC creation time derived from the verified X snowflake ID |
| `verifiedAt` | UTC time of the source verification attempt that produced the record |
| `excerpt` | Short original-language source excerpt; escaped before HTML rendering |
| `truncated` | Whether the available post text ends in a truncation marker |
| `provenance` | Official embed, opt-in official API, or an explicitly reviewed primary source |
| `rulesVersion` | Classifier version |
| `contentHash` | SHA-256 of the visible source text used for classification |

`reported` means the author explicitly reported completion. It is never a direct observation of a visitor's account. A reset credit is distinct from a global quota reset. Missing information stays missing; ambiguous or incomplete records are not promoted by a timer.

The discovery response is untrusted. Its author claims, full text, dates and status labels are not accepted as evidence. The collector passes only a candidate URL to the official embed verification step and derives creation time from that verified ID. Renderer output escapes all dynamic source text.

`health.json` separates operational health from announcement state. Consumers should treat missing timestamps, future timestamps beyond clock-skew tolerance, or more than three hours since a successful check as stale. A degraded source must not erase last-known-good events. The timer is entirely independent of both feeds.
