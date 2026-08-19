const RULES_KEY = 'aem-audit-rules';

// Load the saved validation rules from localStorage. Tolerates missing or corrupt data.
export function loadRules(): string[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

// Persist the validation rules array to localStorage.
export function saveRules(rules: string[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

// Parse and validate imported JSON as a rules array (an array of strings),
// matching the structure saved by the app. Throws a descriptive error otherwise.
export function parseRules(json: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of rules.');
  }
  if (parsed.some((item) => typeof item !== 'string')) {
    throw new Error('Every rule must be a string.');
  }
  return parsed;
}
