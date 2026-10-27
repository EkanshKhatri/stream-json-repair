import { repairJson } from "./repair.js";
import type { RepairOptions } from "./types.js";

/**
 * Result returned by safe parsing.
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Repairs and parses an incomplete or streaming JSON string into a typed JavaScript object/value.
 *
 * @template T - The expected output type.
 * @param input - The raw or streaming JSON string.
 * @param options - Custom repair options.
 * @returns The parsed JavaScript value, or undefined if input is empty.
 * @throws SyntaxError if the string is completely irrecoverable.
 *
 * @example
 * ```ts
 * const partial = '{"name": "Ekansh", "skills": ["TypeScript", "Node';
 * const result = parsePartialJson<{ name: string; skills: string[] }>(partial);
 * console.log(result.skills); // ['TypeScript', 'Node']
 * ```
 */
export function parsePartialJson<T = unknown>(
  input: string,
  options?: RepairOptions
): T | undefined {
  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return undefined;
  }

  const repaired = repairJson(input, options);
  if (!repaired || repaired.trim().length === 0) {
    return undefined;
  }

  return JSON.parse(repaired) as T;
}

/**
 * Safely parses an incomplete or streaming JSON string without throwing errors.
 *
 * @template T - The expected output type.
 * @param input - The raw or streaming JSON string.
 * @param options - Custom repair options.
 * @returns An object containing `{ success: true, data }` or `{ success: false, error }`.
 *
 * @example
 * ```ts
 * const res = safeParsePartialJson('{"user": {"name": "Bob"');
 * if (res.success) {
 *   console.log(res.data);
 * }
 * ```
 */
export function safeParsePartialJson<T = unknown>(
  input: string,
  options?: RepairOptions
): SafeParseResult<T> {
  try {
    const data = parsePartialJson<T>(input, options);
    return { success: true, data: data as T };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
