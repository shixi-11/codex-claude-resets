// Public announcements and personal rolling limits are distinct clocks.
// Never turn an elapsed announcement into evidence of completion.
export function resetStatus(record, now = Date.now()) {
  if (!record || record.state === 'unknown') return { state: 'unknown', remainingMs: null, at: null };
  if (record.state === 'completed') return { state: 'completed', remainingMs: null, at: null };
  if (record.state === 'cancelled') return { state: 'cancelled', remainingMs: null, at: null };
  if (record.state !== 'announced' || !record.sourceUrl || !record.verifiedAt || !record.resetAt) {
    return { state: 'unknown', remainingMs: null, at: null };
  }
  // An explicit offset is mandatory. A wall-clock string must not be interpreted
  // using the build server's timezone or a visitor's timezone.
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(record.resetAt)) return { state: 'unknown', remainingMs: null, at: null };
  const at = Date.parse(record.resetAt);
  if (!Number.isFinite(at)) return { state: 'unknown', remainingMs: null, at: null };
  return { state: at > now ? 'announced' : 'awaitingConfirmation', remainingMs: Math.max(0, at - now), at: record.resetAt };
}

export function countdown(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(n => String(n).padStart(2, '0')).join(':');
}

export function localResetTime(at, language, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone }).format(new Date(at));
}

export function offerStatus(offer, now = Date.now()) {
  if (!offer?.sourceUrl || !Number.isFinite(Date.parse(offer.verifiedAt))) return 'unverified';
  if (offer.endsAt && Date.parse(offer.endsAt) <= now) return 'expired';
  if (offer.state === 'expired') return 'expired';
  if (now - Date.parse(offer.verifiedAt) > 3 * 3600000) return 'stale';
  return offer.state === 'announced' ? 'active' : 'unverified';
}
