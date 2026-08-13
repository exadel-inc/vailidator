import { z } from 'zod';

/**
 * Cleans up a raw LLM response and parses it with the given Zod schema.
 *
 * Handles the common ways a model wraps its JSON output:
 * - an already-parsed object/array (passed through as-is)
 * - markdown code fences (```json ... ```)
 * - leading/trailing commentary around a JSON object or array
 *
 * @param schema The Zod schema the output is validated against.
 * @param response The raw LLM response (string) or an already-parsed value.
 * @returns The parsed, schema-validated value.
 */
export function parseLlmOutput<T>(schema: z.ZodType<T>, response: unknown): T {
  if (typeof response !== 'string') {
    return schema.parse(response);
  }

  const json = extractJson(response);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}. Raw: ${truncate(response)}`
    );
  }

  return schema.parse(parsed);
}

/** Extracts a JSON value from a model response, tolerating fences and surrounding text. */
function extractJson(input: string): string {
  const trimmed = input.trim();

  // Already a JSON object or array literal — parse as-is.
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Strip markdown code fences: ```json ... ``` or ``` ... ```.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence && fence[1]) {
    return fence[1].trim();
  }

  // Fall back to the first balanced JSON object or array anywhere in the text.
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);

  if (start === -1) {
    throw new Error(`No JSON object or array found in LLM response: ${truncate(trimmed)}`);
  }

  return trimmed.slice(start, findJsonEnd(trimmed, start));
}

/** Returns the index just past the balanced JSON value starting at `start`. */
function findJsonEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }

  throw new Error(`Unbalanced JSON in LLM response starting at index ${start}`);
}

/** Shortens long text for error messages. */
function truncate(text: string, max = 500): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
