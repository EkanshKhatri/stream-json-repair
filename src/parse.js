import { repairJson } from "./repair.js";

/**
 * @typedef {import('./repair.js').RepairOptions} RepairOptions
 */

/**
 * @template T
 * @typedef {{ success: true; data: T } | { success: false; error: Error }} SafeParseResult
 */

/**
 * Repairs and parses an incomplete or streaming JSON string into a JavaScript object/value.
 *
 * @template T
 * @param {string} input - The raw or streaming JSON string.
 * @param {RepairOptions} [options] - Custom repair options.
 * @returns {T | undefined} The parsed JavaScript value, or undefined if input is empty.
 * @throws {SyntaxError} if the string is completely irrecoverable.
 *
 * @example
 * ```js
 * const partial = '{"name": "Ekansh", "skills": ["JavaScript", "Node';
 * const result = parsePartialJson(partial);
 * console.log(result.skills); // ['JavaScript', 'Node']
 * ```
 */
export function parsePartialJson(input, options) {
  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return undefined;
  }

  const repaired = repairJson(input, options);
  if (!repaired || repaired.trim().length === 0) {
    return undefined;
  }

  return JSON.parse(repaired);
}

/**
 * Safely parses an incomplete or streaming JSON string without throwing errors.
 *
 * @template T
 * @param {string} input - The raw or streaming JSON string.
 * @param {RepairOptions} [options] - Custom repair options.
 * @returns {SafeParseResult<T>} An object containing `{ success: true, data }` or `{ success: false, error }`.
 *
 * @example
 * ```js
 * const res = safeParsePartialJson('{"user": {"name": "Bob"');
 * if (res.success) {
 *   console.log(res.data);
 * }
 * ```
 */
export function safeParsePartialJson(input, options) {
  try {
    const data = parsePartialJson(input, options);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
