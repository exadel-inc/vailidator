(function() {
  if (document.getElementById('aem-audit-btn')) return;

  function getMarkup() {
    const iframe: HTMLIFrameElement | null =
      document.querySelector('iframe#ContentFrame') ||      // AEM Classic
      document.querySelector('iframe.cq-Overlay-element') || // AEM Touch UI
      document.querySelector('iframe[name="CQ"]');

    if (!iframe) {
      alert('AEM preview iframe not found. Check selector.');
      return null;
    }

    try {
      return iframe.contentDocument?.documentElement.outerHTML;
    } catch {
      alert('Cannot access iframe content. Possible cross-origin restriction.');
      return null;
    }
  }

  function getRules() {
    const input = prompt(
      'Enter validation rules (one per line):',
      'Page must have a Hero banner\nPage must have a phone number'
    );
    if (!input) return null;
    return input.split('\n').map(r => r.trim()).filter(Boolean);
  }

  const btn = document.createElement('button');
  btn.id = 'aem-audit-btn';
  btn.textContent = '🔍 Audit Page';
  btn.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    z-index: 999999;
    background: #1473e6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px 16px;
    font-size: 14px;
    font-family: sans-serif;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  btn.addEventListener('click', async () => {
    const markup = getMarkup();
    if (!markup) return;

    const rules = getRules();
    if (!rules) return;

    btn.textContent = '⏳ Auditing...';
    btn.disabled = true;

    try {
      const PORT = 3011;
      const response = await fetch(`http://localhost:${PORT}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markup, rules }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const html = await response.text();

      const tab = window.open('', '_blank');
      if (!tab) throw new Error('Failed to open new tab. Check popup blocker.');
      tab.document.write(html);
      tab.document.close();

    } catch (err) {
      alert(`Audit failed: ${(err as Error).message}`);
    } finally {
      btn.textContent = '🔍 Audit Page';
      btn.disabled = false;
    }
  });

  document.body.appendChild(btn);
  console.log('[AEM Audit] Button injected.');
})();
