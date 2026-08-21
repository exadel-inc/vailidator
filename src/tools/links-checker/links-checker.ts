import type { LinksCheckerReport } from '../../types/links-checker.types.js'

export async function pingUrl(url: string): Promise<boolean> {
  const scheme = getScheme(url);

  if (scheme === 'mailto') {
    return isValidMailto(url);
  }

  if (scheme === 'tel') {
    return isValidTel(url);
  }

  console.log(`[linksChecker] Pinging URL: ${url}`);
  try {
    const response = await fetch(url);
    console.log(`[linksChecker] URL: ${url} responded with status: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.log(`[linksChecker] URL: ${url} failed with error: ${error}`);
    return false;
  }
}

function getScheme(url: string): string | undefined {
  return url.match(/^([a-z][a-z\\d+.-]*):/i)?.[1].toLowerCase();
}

// Validate the addr-spec portion of a mailto URI without attempting to send mail.
export function isValidMailto(url: string): boolean {
  const addressPart = url.slice('mailto:'.length).split(/[?#]/, 1)[0];
  if (!addressPart) return false;

  try {
    const addresses = decodeURIComponent(addressPart).split(',');
    return addresses.every((address) =>
      /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(address),
    );
  } catch {
    return false;
  }
}

// Validate the subscriber number in a tel URI. Formatting separators and a URI
// extension are allowed; the number must contain 7–15 digits.
export function isValidTel(url: string): boolean {
  const numberPart = url.slice('tel:'.length).split(/[?#]/, 1)[0];
  const [number, ...parameters] = numberPart.split(';');
  if (!number || parameters.some((parameter) => !/^ext=\\d+$/i.test(parameter))) {
    return false;
  }

  const digits = number.replace(/[().\\s.-]/g, '');
  return /^\\+?\\d{7,15}$/.test(digits);
}

// Check each link, resolving relative links against the original page URL when provided.
export async function linksChecker(links: string[], originalUrl?: string): Promise<LinksCheckerReport> {
  console.log('[linksChecker] Running links checker...')
  const report: LinksCheckerReport = []

  const checkPromises = links.map(async (link) => {
    const isValid = await pingUrl(resolveUrl(link, originalUrl));
    report.push({
      url: link,
      status: isValid ? 'valid' : 'invalid',
    });
  });

  await Promise.all(checkPromises);

  console.log('[linksChecker] Links checker finished.')

  return report;
}

// Keep absolute http/https URLs as-is; otherwise resolve against the original page URL.
function resolveUrl(link: string, originalUrl?: string): string {
  if (/^[a-z][a-z\\d+.-]*:/i.test(link) || !originalUrl) {
    return link;
  }
  try {
    return new URL(link, originalUrl).toString();
  } catch {
    return link;
  }
}

export const LINKS_CHECKER_TOOL_DESCRIPTION = 'Run a links_checker against a list of links, resolving relative links against the original page URL. HTTP/HTTPS links are checked for reachability; mailto and tel links are validated for email and phone syntax. Use this when the user asks to check links, validate links, or verify links.';
export const LINKS_CHECKER_TOOL_NAME = 'links_checker';
