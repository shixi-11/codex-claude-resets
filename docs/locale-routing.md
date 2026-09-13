# Locale URLs

English lives at `/ai/codex-claude-resets/en/`. The other eight locale paths are unchanged. All locale pages have self-referencing canonical URLs and reciprocal hreflang links. The homepage `x-default` points to the language-neutral entry; announcement `x-default` points to the corresponding English announcement.

The bare entry (with or without its trailing slash) issues a temporary 307 redirect using Vercel's `x-vercel-ip-country` header. Country groups follow the main site's existing defaults; unsupported or missing countries fall back to English. Explicit locale paths bypass detection. The entry response is private/no-store, so a previous country's redirect cannot become a shared cached choice. No external IP lookup or client IP storage is involved.

Country defaults are in `src/locale-routing.mjs`. Run `node scripts/configure-locale-routing.mjs` after changing them, then run `node --test`. This generates the reset project's `vercel.json` and `infra/main-locale-routes.json`. Main-domain rules must run before the external origin rewrite so they see the visitor's location. Origin redirects use absolute public URLs to remain correct when served through a reverse proxy.

Old `/events/:id/` English links permanently redirect to `/en/events/:id/`, keeping existing shared links and feed items usable. New language-switcher links, sitemap entries, feed items and asset bases use the explicit English directory. Existing timer storage stays on the same origin and is unaffected.

Deployment order: publish and verify the explicit locale pages first, then stage and promote the main-domain rules. Preserve any unrelated main-site project rules when applying the generated list. The main site's own `vercel.json` must carry equivalent entry redirects and `/en/` proxy routes for future deployments.

Recovery: restore the previous main-domain routing version, then revert the locale migration deployment if required. Do not remove old announcement redirects while externally shared links may still use them.
