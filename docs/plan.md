# Codex Respawn｜复活点

2026-09-08 · Owner: current Codex task · Status: delivered · Verification: passed · Acceptance: pending

Build a useful reason to visit Shixi Lin's website: a free, attractive, nine-language answer to “Did Codex reset today?”, with source-linked updates and a personal timer. Publish the website and its automation in one open-source repository. Canonical home: https://shixilin.com/ai/codex-claude-resets/ . Creator: https://shixilin.com/ . Cooperation: info@elevencapital.ltd .

## What we learned

| Reference | Useful mechanism | Our decision |
| --- | --- | --- |
| [Codex Reset](https://codex-reset.com/) | Personal timer, source feed, notification channels, explanations | Keep the useful timer and open feed; label incomplete source text and avoid unsupported forecasts. |
| [Codex Resets](https://codex-resets.com/) | One obvious current question, compact history, social participation | Lead with the question people search; provide a shareable answer. No fabricated crowds or prayer totals. |
| [CodexRunway](https://www.codexrunway.com/) | Local time, open JSON, distribution into a desktop utility | Make the feed reusable, show local time and original UTC, and separate scheduled events from completion. |
| [Codex Reset Monitor](https://codexreset.org/) | Prominent source freshness and evidence | Show last successful retrieval, failures and coverage. Operational status is separate from quota news. |
| [Codex Limit Watch](https://codexlimitwatch.com/codex-reset-history) | Searchable historical destination | Preserve event permalinks. A short reply or a future promise is not proof of completion. |

These observations are a dated product review, not independently audited traffic or revenue claims. The five sites have overlapping but nonidentical event definitions; their counters are not directly comparable.

## Adjacent cases and commercial implications

- [Down for Everyone or Just Me](https://downforeveryoneorjustme.com/) gives a direct answer to an urgent question and has individual service destinations. Apply that to localized Codex reset pages and useful event permalinks. Do not create thin doorway pages for every keyword.
- [ccusage](https://github.com/ccusage/ccusage) offers quick-start commands, local data reporting, and JSON output. Its [downstream integrations](https://github.com/ccusage/ccusage/discussions/928) demonstrate reuse. Make our public JSON, RSS and documented schema easy to consume. Stars indicate developer interest, not revenue or unique users.
- [Have I Been Pwned](https://haveibeenpwned.com/About) combines a free public utility with notifications, API services, a visible creator, and a discreet donation entry. Apply the sequence: useful answer first, subscription next, creator and support links after value. Its mature security business is not a revenue forecast for this project.

## First release

1. Distinctive light interface: warm white, ink green, pale lime, one porcelain keycap character on a lime glass pad, generous readable type, open update rows.
2. Hero says “Out of tokens. Not out of ideas.” with a clear current announcement and source. Never claim to reset an account.
3. Evidence types: global reset, banked reset credit, usage change, ambiguous signal. Lifecycle: announced / reported complete / information / unconfirmed. No clock-driven upgrade to completed.
4. Local-only timer: user enters the date shown in Codex; calendar export . No fixed assumption about which quota windows the account has.
5. Nine complete locales: en, zh, zh-Hant, ja, ko, es, fr, de, ar. English first on a fresh visit; Arabic RTL. Natural Chinese wrapping. Server-rendered HTML, localized metadata, hreflang, canonical, sitemap, event pages.
6. Share links and RSS; a plain JSON feed for integrations. No account, credential collection or client-side LLM needed.
7. Footer creator link and cooperation email; a discreet localized support link to https://shixilin.com/support . GitHub README and FUNDING.yml use the same destination.

## Acquisition and conversion

Primary audience: subscription Codex users whose work is interrupted by limits. Secondary: developer communities, newsletter curators and open-source desktop-tool maintainers.

Acquisition: search-intent titles and useful FAQ; source-linked event pages people can share; an English-first bilingual README with an actual screenshot; discoverable GitHub topics; RSS/JSON for communities to integrate. No unsolicited posts or messages.

Retention: saved personal timer, calendar reminder, RSS, evidence history. The website should still be useful on a quiet day. No fabricated probability, artificial urgency or claim that another person's reset applies to the visitor.

Creator conversion: header/about/footer return to Shixi Lin, a modest more-work link after the main task, and a cooperation email. Support belongs in the footer and README tail, not a modal or primary CTA. Initially optimize for trust and creator discovery; consider relevant sponsorship only after real recurring usage exists. Keep sponsorship visibly separate from evidence if added later.

Launch experiments: (1) actual question-led headline, (2) sharing individual announcements, (3) README screenshot leading to live site, (4) timer-to-return visits. Review search impressions/clicks, referring domains, engaged visits, timer setup, share interactions, homepage outbound clicks and support outbound clicks. Baseline starts unknown. First 30-day evaluation is an experiment, not a traffic promise. Use existing permitted analytics when available; otherwise document missing measurement rather than invent counts.

## Automation and model choice

GitHub Actions fetches new public signals every 30 minutes, with an off-hour offset; a daily workflow produces a compact digest. Both live in this repository. Scheduled Actions can be delayed and are not a real-time SLA. Each run validates, tests and publishes the site. Last-known-good records survive failures; freshness and source failures remain visible.

Default path requires no paid model: a community feed supplies candidate post IDs only; the official X oEmbed endpoint verifies the allowed author and visible text. Strict rules classify explicit language. Truncated text cannot establish omitted timing. Ambiguous posts do not become confirmed events. The optional official X timeline adapter is opt-in and needs the operator's own token; it is never silently activated as a paid fallback.

For daily public Web/X context review, optional local subscription Grok `grok-4.6`, `high`, is appropriate. It returns suggestions and URLs for review. A Codex `gpt-5.6-sol`, `medium`, reviewer is a reasonable optional orchestration configuration where that model is available; `high` only for conflicting chronology or unclear eligibility. These are operator choices, not a requirement to call an LLM every 30 minutes. Do not copy subscription OAuth into hosted GitHub runners. The scheduled production pipeline runs independently of the owner's computer and uses no model by default.

Sources: [X timelines](https://docs.x.com/x-api/posts/timelines/introduction), [X pricing](https://docs.x.com/x-api/getting-started/pricing), [GitHub schedule limitations](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows), [OpenAI plan and reset guidance](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan).

## Delivery gates

Validate classifier counterexamples, invalid and truncated input, deduplication, stale/failure behavior, calendar timestamps and rendering escape rules. Check all nine locales at phone/tablet/desktop widths, keyboard use, timers, filters, sharing, event links and source links. Inspect real screenshots and compare against the concept. Publish the public repository and scheduled workflows, execute a real workflow, integrate with shixilin.com/ai/, and verify canonical production URLs. Do not mark execution complete while publication or automation remains unverified.
