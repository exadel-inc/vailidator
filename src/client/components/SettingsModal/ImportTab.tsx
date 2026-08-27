import { useRef, useState } from 'preact/hooks';
import { parseRules, saveRules } from '../../services/storage';

interface ImportStatus {
  ok: boolean;
  text: string;
}

export function ImportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus | null>(null);

  const onFileChange = () => {
    setFileName(fileRef.current?.files?.[0]?.name ?? null);
    setStatus(null);
  };

  // Validate the selected JSON against the saved settings structure and replace it.
  const importFile = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ ok: false, text: 'Choose a JSON file first.' });
      return;
    }

    try {
      const text = await file.text();
      const rules = parseRules(text);
      saveRules(rules);
      setStatus({
        ok: true,
        text: `Imported ${rules.length} rule${rules.length === 1 ? '' : 's'} and replaced saved settings.`,
      });
    } catch (err) {
      setStatus({ ok: false, text: `Invalid file: ${(err as Error).message}` });
    }
  };

  return (
    <div>
      <p class="va-hint">
        Import a JSON file with the validation rules. The file must be an array of rule strings,
        matching the structure saved by the app.
      </p>
      <div class="va-file-row">
        <input type="file" accept="application/json,.json" ref={fileRef} onInput={onFileChange} />
      </div>
      {fileName && <p class="va-hint">Selected: {fileName}</p>}
      <div class="va-actions">
        <button class="va-btn va-btn--primary" onClick={importFile}>
          Import
        </button>
      </div>
      {status && <p class={status.ok ? 'va-status' : 'va-error'}>{status.text}</p>}
    </div>
  );
}
