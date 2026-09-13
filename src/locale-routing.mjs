// Keep country defaults consistent with the main site's visitor-locale endpoint.
// Country is a starting language choice; explicit locale URLs always take priority.
export const countryGroups = {
  zh: ['CN', 'SG'],
  'zh-Hant': ['TW', 'HK', 'MO'],
  ja: ['JP'],
  ko: ['KR'],
  es: ['ES', 'MX', 'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'HN', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE'],
  fr: ['FR', 'MC', 'BE', 'LU', 'SN', 'CI', 'BF', 'ML', 'NE', 'TG', 'BJ', 'GA', 'CG', 'CD', 'GN'],
  de: ['DE', 'AT', 'LI', 'CH'],
  ar: ['AE', 'SA', 'EG', 'DZ', 'BH', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'PS', 'QA', 'SD', 'SY', 'TN', 'YE'],
};
export const publicBase = '/ai/codex-claude-resets';
const countryCondition = countries => [{ type: 'header', key: 'x-vercel-ip-country', value: `(${countries.join('|')})` }];

// Origin configuration also handles visitors who open the Vercel alias directly.
export function localeRedirects(base = '') {
  const destinationBase = base || `https://shixilin.com${publicBase}`;
  return [
    ...Object.entries(countryGroups).map(([locale, countries]) => ({
      source: `${base}/`, destination: `${destinationBase}/${locale}/`,
      has: countryCondition(countries), permanent: false,
    })),
    { source: `${base}/`, destination: `${destinationBase}/en/`, permanent: false },
    { source: `${base}/events/:id`, destination: `${destinationBase}/en/events/:id/`, permanent: true },
    { source: `${base}/events/:id/`, destination: `${destinationBase}/en/events/:id/`, permanent: true },
  ];
}

// These project rules run on shixilin.com before the external rewrite, where the
// geolocation header belongs to the visitor, not the origin proxy connection.
export function mainLocaleRules() {
  const rule = (name, route) => ({ name, enabled: true, srcSyntax: 'regex', route });
  const redirect = (locale, countries) => rule(`Reset tracker entry: ${locale}`, {
    src: `^${publicBase}/?$`, dest: `${publicBase}/${locale}/`, status: 307,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'X-Vercel-IP-Country' },
    ...(countries ? { has: countryCondition(countries) } : {}),
  });
  return [
    ...Object.entries(countryGroups).map(([locale, countries]) => redirect(locale, countries)),
    redirect('en'),
    rule('Reset tracker legacy English announcements', {
      src: `^${publicBase}/events/([^/]+)/?$`, dest: `${publicBase}/en/events/$1/`, status: 308,
    }),
    rule('Reset tracker directory slash', {
      src: `^${publicBase}/((?:en|zh|zh-Hant|ja|ko|es|fr|de|ar)(?:/events/[^/]+)?)$`,
      dest: `${publicBase}/$1/`, status: 308,
    }),
    rule('Reset tracker Vercel origin', {
      src: `^${publicBase}/(.*)$`, dest: 'https://codex-claude-resets.vercel.app/$1',
      respectOriginCacheControl: true,
    }),
  ];
}
