import { useState } from 'preact/hooks';
import { loadRules } from '../../services/storage';

export function ExportTab() {
  const [message, setMessage] = useState<string | null>(null);

  // Read the saved rules from localStorage and download them as a JSON file.
  const exportJson = () => {
    const rules = loadRules();
    if (rules.length === 0) {
      setMessage('No rules to export yet.');
      return;
    }

    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aem-audit-rules.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage(`Exported ${rules.length} rule${rules.length === 1 ? '' : 's'} as JSON.`);
  };

  return (
    <div>
      <p class="va-hint">Export the validation rules saved in this browser as a JSON file.</p>
      <div class="va-actions">
        <button class="va-btn va-btn--primary" onClick={exportJson}>
          Export rules as JSON
        </button>
      </div>
      {message && <p class="va-status">{message}</p>}
    </div>
  );
}
