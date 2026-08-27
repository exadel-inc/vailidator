import { useEffect, useState } from 'preact/hooks';
import { RulesTab } from './RulesTab';
import { ImportTab } from './ImportTab';
import { ExportTab } from './ExportTab';

type TabId = 'rules' | 'import' | 'export';

const TABS: { id: TabId; label: string }[] = [
  { id: 'rules', label: 'Rules' },
  { id: 'import', label: 'Import' },
  { id: 'export', label: 'Export' },
];

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('rules');

  // Close the modal on Escape.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      class="va-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="va-modal" role="dialog" aria-modal="true">
        <div class="va-modal-header">
          <span class="va-modal-title">Settings</span>
          <button class="va-btn va-btn--ghost va-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>
        <div class="va-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              class={`va-tab${activeTab === tab.id ? ' va-tab--active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div class="va-tab-body">
          {activeTab === 'rules' && <RulesTab />}
          {activeTab === 'import' && <ImportTab />}
          {activeTab === 'export' && <ExportTab />}
        </div>
      </div>
    </div>
  );
}
