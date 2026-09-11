<p align="center"><img src="public/favicon.svg?v=a0a95b2" width="52" alt="Codex &amp; Claude Resets keycap logo"></p>
<h1 align="center">Codex &amp; Claude Resets</h1>
<p align="center"><strong>Reset times. Sources. History.</strong><br>When do Codex and Claude reset? One page. Your local time.</p>
<p align="center"><a href="https://shixilin.com/ai/codex-claude-resets/">Open the tracker</a> · <a href="https://shixilin.com/ai/codex-claude-resets/feed.xml">RSS</a> · <a href="https://shixilin.com/ai/codex-claude-resets/events.json">Public JSON</a> · <a href="#简体中文">简体中文</a></p>

![Codex & Claude Resets desktop interface](https://raw.githubusercontent.com/shixi-11/codex-claude-resets/5c7d1dbbff4bf2b643bf4fa7da6b25ffbb0ebdfe/docs/screenshot.jpg)

Codex & Claude Resets puts the next confirmed Codex and Claude reset time first. See the next confirmed time, the latest relevant post with its publication time, and elapsed time since the last reset announcement. The latest published reset or credit announcement and the current Claude usage promotion appear before recent source posts. Sections are expanded by default.

- **See what was actually said.** Announcements, reported completions, reset credits, usage changes and unconfirmed signals are distinct.
- **Read the complete post.** Codex and Claude both offer “Read full post” and “Show less”. Verified full text is stored alongside the summary; full translations retain the rest of the announcement.
- **See the public clock first.** Confirmed announcement times become local-time countdowns. An approximate source time stays approximate. No verified time means no invented countdown.
- **Follow the latest scheme.** A newer published reset replaces an older credit announcement in the Codex summary. Earlier announcements remain in the recent feed.
- **Scan recent news.** The homepage feed shows the past seven days in descending publication order, with All, Codex and Claude filters. Older records retain their permanent links.
- **Know the timezone.** Announcement, offer deadline, news and successful-check timestamps use the visitor’s device timezone and show its offset. Language selection does not change timezone; daylight saving follows the date.
- **Stay current.** The open page refreshes public records automatically. No notifications, email subscriptions or personal-account access.
- **Read news in nine languages.** English opens by default, with 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Deutsch and العربية available. Post excerpts follow the selected language; the original source is one click away.
- **Follow without another account.** RSS, public JSON and permanent event links are built in.


### What enters the feed

Only quota resets, reset credits and subscription allowance information enter the feed. The word “usage” alone is insufficient: model adoption, retirement and launch posts are excluded unless they also concern allowance. Complete stored evidence is reclassified on every collection run, so a rule fix also removes older false positives. Unavailable sources and incomplete excerpts never justify deleting previously verified full evidence. See [collection and classification rules](docs/data.md#collection-and-classification-rules).

### What “checked” means

The collector polls @thsottiaux, @OpenAIDevs, @OpenAI, @ClaudeDevs, @AnthropicAI and @claudeai through the public FxEmbed relay. Each account has its own discovery budget; busy accounts cannot displace another account’s candidates. X official embeds independently check author, post ID and visible text. For a long post, the full relay text must match that official excerpt and the post timestamp; its record identifies `x-oembed+fxembed` provenance. This is a relay-backed tracker, not an official X API integration. Community pages are fallback link indexes only. Claude promotion terms are fetched directly from its official help center.

A post that remains truncated stays **unconfirmed**, even when the visible portion sounds promising. An announcement never becomes a completed reset just because time has passed. “Reported complete” describes the source's statement; it does not verify your account.

The page shows the last successful check time. Independent Codex and Claude check results are recorded in `health.json`. A platform is healthy only when all its configured timelines were read and its candidate evidence checks succeeded. No new relevant post is a valid outcome; a failed source is incomplete coverage. After three hours without a successful check, it marks the data as potentially stale, including in a tab left open. This is a selective announcement feed, not a complete account or service-status monitor. See [OpenAI's usage guidance](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) for account-specific details.

Post translations are cached in `data/translations.json` and bound to the exact excerpt and source content hash. The scheduled collector uses FxEmbed's documented `lang` parameter for newly discovered text; failed translations remain pending and display the English original. Current excerpts receive editorial correction, especially for reset-credit terminology. Translated prose never determines evidence status or countdown time. The browser receives cached text, with no translation credentials or paid API fallback.

### Runs on its own

The site, source records, collector and GitHub Actions workflow all live in this repository.

| Job | Schedule | Output |
| --- | --- | --- |
| Announcement check | At minutes 17 and 47 each hour | Verified records, source health, rebuilt site |
| Daily digest | 02:23 UTC daily | A source-linked Markdown digest of the previous UTC day |
| Manual refresh | GitHub Actions → Run workflow | Check, digest and deployment |

GitHub schedules may be delayed. Failures retain existing records and publish the degraded health state. The production workflow requires **no paid API or model**. An optional X API adapter exists in the collector, but paid access is never enabled by default. Subscription OAuth and device credentials do not belong in repository secrets or hosted runners.

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

**还要多久重置？** Codex & Claude Resets把Codex和Claude的已确认重置时间、倒计时、重置卡和额外额度消息放在同一页，自动按访客本地时区显示，并附原始来源。由光之十一制作。

[打开网站](https://shixilin.com/ai/codex-claude-resets/zh/) · [RSS订阅](https://shixilin.com/ai/codex-claude-resets/feed.xml) · [公开JSON](https://shixilin.com/ai/codex-claude-resets/events.json)

- 区分重置预告、已宣布完成、重置卡、额度变化和尚未确认的线索。
- Codex和Claude两边均可展开、收起全文。采集时同时保存经核验的完整正文与摘要，全文翻译保留公告的后续内容。
- 原文截断就保留为尚未确认，不根据时间推算“已经恢复”。
- 首页展示下次重置、最新相关推文和上次重置公告；上次公告以持续更新的已过去时间显示，准确日期与来源在下方查看。
- 最新重置与额度方案放在近期消息前面。Codex按发布时间选择最新的统一重置或赠卡公告，较早方案留在消息记录中。
- 消息列表只显示最近7天，按原帖发布时间从新到旧排列，支持全部、Codex、Claude筛选。历史原始记录及独立链接仍保留。
- 公告、截止时间、消息列表和上次成功检查时间均显示访客设备的本地时间及GMT偏移，自动处理夏令时；切换语言不会改变时区。
- 默认英文，提供九种语言，消息正文随语言切换并保留原文入口。新消息自动尝试翻译，未完成时显示英文原文与待更新提示。
- 只收录额度重置、重置卡及订阅额度信息；模型退役、发布或使用人数变化不会仅因含有“usage”而进入消息列表。规则更新后会重新判断完整历史原文，清除误收。
- 六个允许的官方账号分别采集，Codex与Claude的独立检查状态保存在数据中，页面保留上次成功检查时间。没有新消息与来源检查失败分开处理；计划、线索、补发和已宣布完成不会混为一谈。
- 每半小时检查公开消息，每天生成来源摘要。调度可能延迟，来源故障和过期状态会在页面显示。

网站无法查看或重置个人账号的实际额度。请以Codex额度面板或CLI中的`/status`为准。日常自动化不需要付费模型，也不会把订阅登录凭据上传到GitHub。

---

Made by [Shixi Lin](https://shixilin.com/?lang=en). For collaborations: [info@elevencapital.ltd](mailto:info@elevencapital.ltd).

If this little checkpoint is useful, you can [support the project](https://shixilin.com/support?lang=en).

Independent project. Not affiliated with OpenAI or Anthropic.
