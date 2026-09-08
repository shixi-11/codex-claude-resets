<p align="center"><img src="public/favicon.svg" width="52" alt="Codex &amp; Claude Resets keycap logo"></p>
<h1 align="center">Codex &amp; Claude Resets</h1>
<p align="center"><strong>Reset times. Sources. History.</strong><br>When do Codex and Claude reset? One page. Your local time.</p>
<p align="center"><a href="https://shixilin.com/ai/codex-claude-resets/">Open the tracker</a> · <a href="https://shixilin.com/ai/codex-claude-resets/feed.xml">RSS</a> · <a href="https://shixilin.com/ai/codex-claude-resets/events.json">Public JSON</a> · <a href="#简体中文">简体中文</a></p>

![Codex & Claude Resets desktop interface](docs/screenshot.jpg)

Codex & Claude Resets puts the next confirmed Codex and Claude reset time first. See the next confirmed time, the latest relevant post with its publication time, and the last reset announcement. Older records and extra-usage offers are expanded by default.

- **See what was actually said.** Announcements, reported completions, reset credits, usage changes and unconfirmed signals are distinct.
- **See the public clock first.** Confirmed announcement times become local-time countdowns. An approximate source time stays approximate. No verified time means no invented countdown.
- **Stay current.** The open page refreshes public records automatically. No notifications, email subscriptions or personal-account access.
- **Read news in nine languages.** English opens by default, with 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Deutsch and العربية available. Post excerpts follow the selected language; the original source is one click away.
- **Follow without another account.** RSS, public JSON and permanent event links are built in.


### What “checked” means

The collector polls Tibo and ClaudeDevs timelines through the public FxEmbed relay. X official embeds independently check author, post ID and visible text. For a long post, the full relay text must match that official excerpt and the post timestamp; its record identifies `x-oembed+fxembed` provenance. This is a relay-backed tracker, not an official X API integration. Community pages are fallback link indexes only. Claude promotion terms are fetched directly from its official help center.

A post that remains truncated stays **unconfirmed**, even when the visible portion sounds promising. An announcement never becomes a completed reset just because time has passed. “Reported complete” describes the source's statement; it does not verify your account.

The page shows source health and the last successful check. After three hours without a successful check, it marks the data as potentially stale, including in a tab left open. This is a selective announcement feed, not a complete account or service-status monitor. See [OpenAI's usage guidance](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) for account-specific details.

Post translations are cached in `data/translations.json` and bound to the exact excerpt and source content hash. The scheduled collector uses FxEmbed's documented `lang` parameter for newly discovered text; failed translations remain pending and display the English original. Current excerpts receive editorial correction, especially for reset-credit terminology. Translated prose never determines evidence status or countdown time. The browser receives cached text, with no translation credentials or paid API fallback.

### Runs on its own

The site, source records, collector and GitHub Actions workflow all live in this repository.

| Job | Schedule | Output |
| --- | --- | --- |
| Announcement check | At minutes 17 and 47 each hour | Verified records, source health, rebuilt site |
| Daily digest | 02:23 UTC daily | A source-linked Markdown digest of the previous UTC day |
| Manual refresh | GitHub Actions → Run workflow | Check, digest and deployment |

GitHub schedules may be delayed. Failures retain existing records and publish the degraded health state. The production workflow requires **no paid API or model**. An optional X API adapter exists in the collector, but paid access is never enabled by default. Subscription OAuth and device credentials do not belong in repository secrets or hosted runners.

For optional editorial review, Grok `grok-4.6` with `high` reasoning can review new public Web/X context through an operator's authorized local subscription CLI. This is separate from the unattended pipeline; no model gets to mark incomplete evidence as confirmed. See [automation notes](docs/automation.md).

### Run locally

Node.js 24 is enough to test, collect and build the site. Published assets are checked in; no package installation is needed for a normal build.

```sh
node --test
node scripts/build.mjs
node scripts/serve.mjs
```

Open `http://127.0.0.1:4187/`. To refresh data, run `node scripts/collect.mjs`. To create a digest, run `node scripts/digest.mjs`.

For image processing or browser checks, install development dependencies with `pnpm install`. `pnpm qa` uses an installed Chrome in headless mode. This application does not collect visitor account data or email addresses.

### Reuse the feed

```sh
curl https://shixilin.com/ai/codex-claude-resets/events.json
```

Each event has a source URL, post ID, type, evidence state, creation and verification timestamps, a short excerpt, truncation flag, provenance, rules version and content hash. A stable post ID is the deduplication key. Details and the trust boundary are in [the data notes](docs/data.md).

Code is MIT-licensed. Fonts retain their own OFL licenses. Source excerpts remain attributable to their authors. The mascot was generated for this project; image provenance is documented in [assets](docs/assets.md).

---

## 简体中文

**还要多久重置？** Codex & Claude Resets把Codex和Claude的已确认重置时间、倒计时、重置卡和额外额度消息放在同一页，自动按访客本地时区显示，并附原始来源。

[打开网站](https://shixilin.com/ai/codex-claude-resets/zh/) · [RSS订阅](https://shixilin.com/ai/codex-claude-resets/feed.xml) · [公开JSON](https://shixilin.com/ai/codex-claude-resets/events.json)

- 区分重置预告、已宣布完成、可用重置次数、额度变化和尚未确认的线索。
- 原文截断就保留为尚未确认，不根据时间推算“已经恢复”。
- 首页直接展示下次重置、最新相关推文及其发布时间、上次重置；更早记录与额度活动默认展开。
- 默认英文，提供九种语言；网站和自动更新放在同一个开源仓库。
- 每半小时检查公开消息，每天生成来源摘要。调度可能延迟，来源故障和过期状态会在页面显示。

网站无法查看或重置个人账号的实际额度。请以Codex额度面板或CLI中的`/status`为准。日常自动化不需要付费模型，也不会把订阅登录凭据上传到GitHub。

---

Made by [Shixi Lin](https://shixilin.com/?lang=en). For collaborations: [info@elevencapital.ltd](mailto:info@elevencapital.ltd).

If this little checkpoint is useful, you can [support the project](https://shixilin.com/support?lang=en).

Independent project. Not affiliated with OpenAI or Anthropic.
