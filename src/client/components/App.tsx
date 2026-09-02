import { useState } from 'preact/hooks';
import type { AuditReport } from '../../types/audit-reports.types.js';
import { Dropdown } from './Dropdown/Dropdown';
import { SettingsModal } from './SettingsModal/SettingsModal';
import { Report } from './Report/Report';
import { Logger } from './Logger/Logger';
import { getIframeUrl, getMarkup, runAudit } from '../services/audit';
import { loadRules } from '../services/storage';

export function App() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [logVisible, setLogVisible] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

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
    setLogVisible(true);
    try {
      console.log('[AEM Audit] Running audit...');
      const result = await runAudit(markup, rules, pageUrl);
      setReport(result);
      setReportOpen(true);
      console.log('[AEM Audit] Report rendered.');
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

  const handleLogState = () => {
    setDropdownOpen(false);
    setLogVisible(!logVisible);
  };

  const handleShowResult = () => {
    setDropdownOpen(false);
    setReportOpen(true);
  };

  return (
    <>
      <Dropdown
        open={dropdownOpen}
        auditing={auditing}
        onToggle={() => setDropdownOpen(!dropdownOpen)}
        onAudit={handleAudit}
        onSettings={handleSettings}
        onToggleLog={handleLogState}
        onShowResult={handleShowResult}
        hasResult={report !== null}
      />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {report && reportOpen && <Report report={report} onClose={() => setReportOpen(false)} />}
      <Logger isVisible={logVisible} busy={auditing} />
    </>
  );
}
