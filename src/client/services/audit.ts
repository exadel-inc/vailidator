const AUDIT_PORT = 3011;
const AUDIT_URL = `http://localhost:${AUDIT_PORT}/audit`;

// Grab the rendered HTML markup from the AEM preview iframe.
export function getMarkup(): string | null {
  const iframe: HTMLIFrameElement | null =
    document.querySelector('iframe#ContentFrame') ||      // AEM Classic
    document.querySelector('iframe.cq-Overlay-element') || // AEM Touch UI
    document.querySelector('iframe[name="CQ"]');

  if (!iframe) {
    alert('AEM preview iframe not found. Check selector.');
    return null;
  }

  try {
    return iframe.contentDocument?.documentElement.outerHTML ?? null;
  } catch {
    alert('Cannot access iframe content. Possible cross-origin restriction.');
    return null;
  }
}

// POST the markup + rules to the audit service and return the rendered report HTML.
export async function runAudit(markup: string, rules: string[]): Promise<string> {
  const response = await fetch(AUDIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markup, rules }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response.text();
}

// Render the report HTML in a new browser tab.
export function openReportInTab(html: string): void {
  const tab = window.open('', '_blank');
  if (!tab) {
    throw new Error('Failed to open new tab. Check popup blocker.');
  }
  tab.document.write(html);
  tab.document.close();
}
