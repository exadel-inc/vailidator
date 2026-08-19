import { useEffect, useRef } from 'preact/hooks';

interface DropdownProps {
  open: boolean;
  auditing: boolean;
  onToggle: () => void;
  onAudit: () => void;
  onSettings: () => void;
}

export function Dropdown({ open, auditing, onToggle, onAudit, onSettings }: DropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the menu on an outside click or on Escape.
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      const path = e.composedPath();
      if (rootRef.current && !path.includes(rootRef.current)) {
        onToggle();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onToggle]);

  return (
    <div ref={rootRef}>
      <button class="va-trigger" onClick={onToggle} disabled={auditing}>
        {auditing ? 'Auditing...' : 'VAIlidator ▾'}
      </button>
      {open && (
        <div class="va-menu" role="menu">
          <button class="va-menu-item" role="menuitem" onClick={onAudit} disabled={auditing}>
            Audit
          </button>
          <button class="va-menu-item" role="menuitem" onClick={onSettings}>
            Settings
          </button>
        </div>
      )}
    </div>
  );
}
