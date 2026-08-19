import { useState } from 'preact/hooks';
import { Dropdown } from './Dropdown';
import { SettingsModal } from './SettingsModal';
import { getIframeUrl, getMarkup, openReportInTab, runAudit } from '../services/audit';
import { loadRules } from '../services/storage';

export function App() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);

  const handleAudit = async () => {
    setDropdownOpen(false);
    if (auditing) return;

    const pageUrl = getIframeUrl();
    if (!pageUrl) return;
    const markup = getMarkup();
    if (!markup) return;

    // Use saved rules; fall back to the legacy prompt when nothing is saved.
    let rules = loadRules();
    if (rules.length === 0) {
      const input = window.prompt(
        'Enter validation rules (one per line):',
        'Page must have a Hero banner\nPage must have a phone number'
      );
      if (!input) return;
      rules = input.split('\n').map((r) => r.trim()).filter(Boolean);
      if (rules.length === 0) return;
    }

    setAuditing(true);
    try {
      console.log('[AEM Audit] Running audit...');
      const html = await runAudit(markup, rules, pageUrl);
      openReportInTab(html);
      console.log('[AEM Audit] Report opened in new tab.');
    } catch (err) {
      alert(`Audit failed: ${(err as Error).message}`);
    } finally {
      setAuditing(false);
    }
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    setSettingsOpen(true);
  };

  return (
    <>
      <Dropdown
        open={dropdownOpen}
        auditing={auditing}
        onToggle={() => setDropdownOpen(!dropdownOpen)}
        onAudit={handleAudit}
        onSettings={handleSettings}
      />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
