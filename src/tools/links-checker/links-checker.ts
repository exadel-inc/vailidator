import type { LinksCheckerReport } from '../../types/links-checker.types.js'

export async function pingUrl(url: string): Promise<boolean> {
  console.log(`[agent] Pinging URL: ${url}`);
  try {
    const response = await fetch(url);
    console.log(`[agent] URL: ${url} responded with status: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.log(`[agent] URL: ${url} failed with error: ${error}`);
    return false;
  }
}

// Check each link, resolving relative links against the original page URL when provided.
export async function linksChecker(links: string[], originalUrl?: string): Promise<LinksCheckerReport> {
  console.log('[agent] Running links checker...')
  const report: LinksCheckerReport = []

  const checkPromises = links.map(async (link) => {
    const isValid = await pingUrl(resolveUrl(link, originalUrl));
    report.push({
      url: link,
      status: isValid ? 'valid' : 'invalid',
    });
  });

  await Promise.all(checkPromises);

  console.log('[agent] Links checker finished.')

  return report;
}

// Keep absolute http/https URLs as-is; otherwise resolve against the original page URL.
function resolveUrl(link: string, originalUrl?: string): string {
  if (/^https?:\/\//i.test(link) || !originalUrl) {
    return link;
  }
  try {
    return new URL(link, originalUrl).toString();
  } catch {
    return link;
  }
}
