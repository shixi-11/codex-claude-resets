export const CANONICAL = 'https://shixilin.com/ai/codex-claude-resets/';
export const REPO = 'https://github.com/shixi-11/codex-claude-resets';
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function freshness(health, now = Date.now()) {
  const at = Date.parse(health.lastSuccessAt);
  if (!Number.isFinite(at) || at > now + 300000 || now - at > 3 * 3600000) return 'stale';
  return health.status === 'ok' ? 'fresh' : 'degraded';
}
export const localePath = lang => lang === 'en' ? '' : `${lang}/`;
export const eventPath = (lang, id) => `${localePath(lang)}events/${id}/`;
export function calendarFile(timestamp, title, url = CANONICAL) {
  if (!Number.isFinite(timestamp)) throw new Error('Invalid timestamp');
  const date = new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const clean = String(title).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Codex Respawn//Personal reminder//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:codex-respawn-${timestamp}@shixilin.com`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}`,`DTSTART:${date}`,`SUMMARY:${clean}`,`URL:${url}`,'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${clean}`,'END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
