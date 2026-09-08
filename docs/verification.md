# Release verification · 2026-09-08

The first screen now contains independent Codex and Claude digital timers, with public-announcement and personal-account modes. Brand, bookmark title, favicon, home-screen icon, transparent mascot and sharing artwork use Codex & Claude Resets. Offers and history follow the clocks.

- 25 unit tests pass, including source classification, four clock states, malformed storage, isolated personal deadlines, calendar alarms and completeness of all nine translations.
- Headless Chrome passed 27 locale/viewport combinations at 1440, 768 and 390 CSS pixels: no horizontal overflow, missing images or page errors. History filters, pagination, language selection, event permalinks, FAQ and keyboard entry were exercised.
- Four browser timezone tests passed: Shanghai, Los Angeles, Berlin and Lord Howe. They cover separate Codex/Claude timers, public/personal isolation, reload persistence, UTC calendar export, real Web Audio alert-node creation and due states that never claim account restoration.
- The original approved mascot was processed with Adobe background removal; its PNG has a genuine 0–255 alpha channel. The generated checkerboard candidate was rejected and never used upstream.
- A complete first-party Tibo announcement saying “All reset for everyone.” is recognized only for the exact verified-author formulation. Quoted, truncated, speculative and other-author variants remain unconfirmed. The collector checked 18 records successfully at 2026-09-08T05:48:05.391Z; Claude promotion terms were checked directly at 05:48:20Z.

In-page alarms require an open page, an awake device and sound permission; browser throttling can delay them. Calendar export supports reminders after closing the page. The page does not read visitor quota or promise account restoration. The existing half-hourly GitHub update and daily digest schedules remain unchanged.

Production release f39ec88 passed GitHub Actions run [34192419726](https://github.com/shixi-11/codex-respawn/actions/runs/34192419726). The public personal-domain page was verified in Chrome after following the renamed entry from the main AI collection: English default, two timers, two alarm buttons, current keycap favicon, genuine transparent mascot, Chinese mobile rendering and support link all passed.
