import { useEffect } from 'preact/hooks';
import { Fragment } from 'preact';
import type { AuditItem, AuditReport, ValidationRuleResult } from '../../../types/audit-reports.types.js';

interface ReportProps {
  report: AuditReport;
  onClose: () => void;
}

type ReportItem = AuditItem | ValidationRuleResult;

// Large modal that renders the validated audit report returned by the server.
export function Report({ report, onClose }: ReportProps) {
  // Close the modal on Escape.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const seo = report.seo ?? [];
  const accessibility = report.accessibility ?? [];
  const validation = report.validation ?? [];

  return (
    <div
      class="va-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="va-modal va-modal--wide" role="dialog" aria-modal="true">
        <div class="va-modal-header">
          <span class="va-modal-title">Audit Report</span>
          <button class="va-btn va-btn--ghost va-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>
        <div class="va-report-body">
          <p class="va-report-summary">{report.summary}</p>
          <div class="va-scoreboard">
            <ScoreCard label="SEO" items={seo} />
            <ScoreCard label="Accessibility" items={accessibility} />
            <ScoreCard label="Validation rules" items={validation} />
          </div>
          <ReportSection title="SEO" items={seo} />
          <ReportSection title="Accessibility" items={accessibility} />
          <ReportSection title="Validation rules" items={validation} />
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, items }: { label: string; items: ReportItem[] }) {
  const pass = items.filter((item) => item.status === 'pass').length;
  return (
    <div class="va-score-card">
      <span class="va-score-label">{label}</span>
      <span class="va-score-value">
        {pass}/{items.length}
      </span>
      <span class="va-score-sub">passed</span>
    </div>
  );
}

function ReportSection({ title, items }: { title: string; items: ReportItem[] }) {
  return (
    <section class="va-report-section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p class="va-report-empty">No issues found.</p>
      ) : (
        items.map((item, i) => (
          <article key={i} class={`va-report-item va-report-item--${item.status}`}>
            <div class="va-report-item-header">
              <span class={`va-badge va-badge--${item.status}`}>{statusLabel(item.status)}</span>
              <h4>{itemTitle(item)}</h4>
              {'id' in item && <code>{item.id}</code>}
            </div>
            <p class="va-report-desc">{item.description}</p>
            {item.recommendation && (
              <p class="va-report-reco">
                <strong>Recommendation:</strong> {item.recommendation}
              </p>
            )}
          </article>
        ))
      )}
    </section>
  );
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function itemTitle(item: ReportItem): string {
  return 'title' in item ? item.title : item.rule;
}
