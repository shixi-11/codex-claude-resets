# Automatic reset tracker: product and verification

## Visitor outcome

A visitor can immediately see whether a public reset has a confirmed schedule, find the latest verified reset announcement, check their actual account usage, and follow future announcements with one click. No personal date entry is required.

## Implemented

- Removed manual timers, input forms, local-storage clock persistence and their obsolete tests.
- Separated the next announcement from the latest confirmed reset record. Unknown schedules remain unknown; a passed deadline awaits confirmation.
- Alerts follow changed or cancelled announcements and new confirmed completions. Repeated checks do not repeat an alert. Historical records do not ring on enable.
- The open page checks published JSON every minute and when returning to the page. The existing backend checks sources twice hourly and produces a daily digest. These are separate cadences; this is not a direct real-time X subscription.
- Platforms, offers, history and source health update together. Invalid or failed responses preserve the last valid data and show a connection message.
- Announced times older than three hours since verification no longer sustain a countdown.
- Built the reset station in Blender 4.5 LTS. Editable scene: design/reset-station/reset-station.blend. A transparent WebP render is used in the interface, with a small state change when watching. No WebGL dependency or foreground Blender window is needed.
- Preserved the approved keycap mascot, nine languages, English default, local time, source links, RSS, JSON, support and collaboration links.
- Changed the canonical URL and repository slug to codex-claude-resets. Existing RSS GUIDs remain stable.

## Validation

20 unit tests; 10 automatic announcement/alert browser scenarios; 27 language/viewport combinations, plus filters, pagination, FAQ, language switching, event pages and keyboard focus. Main-site locale, font and production-build checks pass. Production migration is checked separately after deployment.

## Deliberate limits

This public site cannot read visitor account balances. In-page alerts require the page and device to remain active; browser background throttling can delay them. Calendar export is offered when an announcement has a confirmed future instant. Unknown schedules do not get a guessed forecast or a manual replacement clock.
