// A personal deadline comes only from a visitor's account, never a forecast.
export const timerKey = platform => `reset-tracker-personal-${platform}-v2`;
export function readPersonalClock(storage, platform) {
  try {
    const saved = Number(storage.getItem(timerKey(platform)));
    if (Number.isFinite(saved) && saved > 0 && saved <= Date.now()+366*86400000) return saved;
    if (platform === 'codex') {
      const legacy = Number(storage.getItem('codex-respawn-timer-v1'));
      if (Number.isFinite(legacy) && legacy > 0 && legacy <= Date.now()+366*86400000) {
        storage.setItem(timerKey(platform), String(legacy));
        storage.removeItem('codex-respawn-timer-v1');
        return legacy;
      }
    }
  } catch { /* Private browsing may deny storage; in-memory timers still work. */ }
  return 0;
}
export function validDeadline(value, now = Date.now()) {
  return Number.isFinite(value) && value > now && value <= now + 366 * 86400000;
}
export function personalClockState(deadline, now = Date.now()) {
  if (!Number.isFinite(deadline) || deadline <= 0) return { state:'empty', remainingMs:null };
  return { state:deadline > now ? 'running' : 'due', remainingMs:Math.max(0, deadline - now) };
}
export function alarmCalendar(deadline, platform, description) {
  const escape = value => String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Codex and Claude Resets//Timers//EN','BEGIN:VEVENT',`UID:${platform}-${deadline}@shixilin.com`,`DTSTAMP:${stamp(Date.now())}`,`DTSTART:${stamp(deadline)}`,`SUMMARY:${escape(platform + ' · ' + description)}`,`DESCRIPTION:${escape(description)}`,'BEGIN:VALARM','TRIGGER:PT0S','ACTION:DISPLAY',`DESCRIPTION:${escape(platform + ' · ' + description)}`,'END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
