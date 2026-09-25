/**
 * Public base URL for sitemap, robots, social previews and payment return links.
 * Order: explicit NEXT_PUBLIC_SITE_URL → Vercel's production domain (set automatically) → localhost.
 */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
