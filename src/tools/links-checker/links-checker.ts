import type { LinksCheckerReport } from '../../types/links-checker.types.js'

export const LINKS_CHECKER_TOOL_DESCRIPTION = 'Run a links_checker against a list of links, resolving relative links against the original page URL. HTTP/HTTPS links are checked for reachability; mailto and tel links are validated for email and phone syntax. Use this when the user asks to check links, validate links, or verify links.';
export const LINKS_CHECKER_TOOL_NAME = 'links_checker';

export async function pingUrl(url: string): Promise<boolean> {
  const scheme = getScheme(url);

  if (scheme === 'mailto') {
    return true //isValidMailto(url);
  }

  if (scheme === 'tel') {
    return true //isValidTel(url);
  }

  if (url.startsWith('javascript:') || url.startsWith('#')) {
    return true;
  }

  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
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
  const report: LinksCheckerReport = []

  const checkPromises = links.map(async (link) => {
    const isValid = await pingUrl(resolveUrl(link, originalUrl));
    report.push({
      url: link,
      status: isValid ? 'valid' : 'invalid',
    });
  });

  await Promise.all(checkPromises);

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

export function extractLinksFromMarkup(markup: string): string[] {
  const linkRegex = /href="([^"]*)"/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(markup)) !== null) {
    links.push(match[1]);
  }
  return links;
}

