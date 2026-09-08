# Automation

The production workflow is `.github/workflows/site.yml`. It checks announcements twice hourly, writes a daily Markdown digest at 02:23 UTC, validates records, builds the static site and deploys GitHub Pages. Public files are served on `shixilin.com/ai/codex-claude-resets/` through the personal website's Vercel rewrite.

The default collector needs no token, LLM or billing account. Tibo and ClaudeDevs public timelines are polled through FxEmbed. Community discovery pages supply fallback URLs only. X official embeds verify the author, post identity and visible text. Full long-post text can be retrieved through FxEmbed after the author, ID, timestamp and visible official excerpt match; provenance identifies that relay. Full source text is hashed, not republished in full. Quotes are limited to a short excerpt.

`X_BEARER_TOKEN` together with `ENABLE_PAID_X_API=true` explicitly selects the optional official timeline adapter when running the collector. The hosted workflow does not set either value. Operators must review X's current pricing and permissions before enabling this path. There is no silent paid fallback.

Optional human editorial work can use a locally authorized Grok subscription CLI, model `grok-4.6`, reasoning `high`, for editorial review of supplied public evidence. The installed Research session tested on September 8 could not live-search X, so it is not used as a timeline collector. A code or chronology review can use the operator's available Codex model at `medium` or `high` reasoning. This is an editorial choice, not a cron dependency. Keep OAuth, local profiles and subscription credentials off GitHub runners. Model output is advisory and must link to a primary source.

Failed discovery or verification retains existing event records. The health file records the current attempt and source failures. The browser also ages the timestamp so a failed deployment cannot leave a permanently green status. A daily digest with no collected posts says exactly that; it does not claim no reset happened.

GitHub scheduled workflows have no real-time guarantee and can be disabled after prolonged repository inactivity. Review the Actions page and the site's visible last-check time. `workflow_dispatch` allows an operator to run a fresh check. Site consumers can use RSS or JSON; the workflow does not publish to social accounts or message third parties.
