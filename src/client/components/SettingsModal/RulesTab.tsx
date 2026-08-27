import { useState } from 'preact/hooks';
import { loadRules, saveRules } from '../../services/storage';

interface RuleItem {
  id: number;
  value: string;
}

let ruleId = 0;
function nextId(): number {
  ruleId += 1;
  return ruleId;
}

export function RulesTab() {
  // Prefill from saved rules; otherwise start with a single empty input.
  const [items, setItems] = useState<RuleItem[]>(() => {
    const saved = loadRules();
    const initial = saved.length > 0 ? saved : [''];
    return initial.map((value) => ({ id: nextId(), value }));
  });
  const [justSaved, setJustSaved] = useState(false);

  const updateItem = (id: number, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const addItem = () => {
    setItems([...items, { id: nextId(), value: '' }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Collect every input as a separate rule and persist the array.
  const submit = () => {
    const cleaned = items.map((item) => item.value.trim()).filter(Boolean);
    saveRules(cleaned);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div>
      {items.map((item) => (
        <div class="va-rule-row" key={item.id}>
          <input
            class="va-input"
            value={item.value}
            placeholder="Enter a validation rule"
            onInput={(e) => updateItem(item.id, (e.target as HTMLInputElement).value)}
          />
          <button class="va-btn va-btn--danger" title="Remove rule" onClick={() => removeItem(item.id)}>
            ×
          </button>
        </div>
      ))}
      <div class="va-actions">
        <button class="va-btn va-btn--ghost" onClick={addItem}>
          + Add rule
        </button>
        <button class="va-btn va-btn--primary" onClick={submit}>
          Submit
        </button>
      </div>
      {justSaved && <p class="va-status">Rules saved.</p>}
    </div>
  );
}
