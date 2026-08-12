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

export async function linksChecker(links: string[]): Promise<LinksCheckerReport> {
  console.log('[agent] Running links checker...')
  const report: LinksCheckerReport = []

  const checkPromises = links.map(async (link) => {
    const isValid = await pingUrl(link);
    report.push({
      url: link,
      status: isValid ? 'valid' : 'invalid',
    });
  });

  await Promise.all(checkPromises);

  console.log('[agent] Links checker finished.')

  return report;
}
