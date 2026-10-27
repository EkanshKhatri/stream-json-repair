import { repairJson } from "./repair.js";

/**
 * @typedef {import('./repair.js').RepairOptions} RepairOptions
 */

/**
 * @typedef {RepairOptions & { onError?: (error: Error, rawChunk: string) => void }} StreamJsonOptions
 */

/**
 * @template T
 * @typedef {Object} StreamSnapshot
 * @property {string} raw - The raw cumulative text received so far.
 * @property {string} repaired - The valid repaired JSON string.
 * @property {T} value - The parsed JavaScript object.
 * @property {boolean} isComplete - True if the JSON structure is completely closed without synthetic repairs.
 */

/**
 * Creates an AsyncGenerator that consumes chunks from an AsyncIterable<string>
 * and yields updated parsed snapshots as tokens stream in.
 *
 * @template T
 * @param {AsyncIterable<string>} asyncIterable - An async stream or generator of string chunks (e.g. OpenAI/Gemini/Fetch stream).
 * @param {StreamJsonOptions} [options] - Stream repair options.
 * @returns {AsyncGenerator<StreamSnapshot<T>, void, unknown>}
 *
 * @example
 * ```js
 * for await (const snapshot of parseJsonStream(tokenChunks)) {
 *   console.log("Current object:", snapshot.value);
 * }
 * ```
 */
export async function* parseJsonStream(asyncIterable, options) {
  let accumulated = "";

  for await (const chunk of asyncIterable) {
    if (!chunk) continue;
    accumulated += chunk;

    try {
      const repaired = repairJson(accumulated, options);
      if (!repaired || repaired.trim().length === 0) continue;

      let isComplete = false;
      try {
        JSON.parse(accumulated.trim());
        isComplete = true;
      } catch {
        isComplete = false;
      }

      const value = JSON.parse(repaired);

      yield {
        raw: accumulated,
        repaired,
        value,
        isComplete,
      };
    } catch (err) {
      if (options?.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)), accumulated);
      }
    }
  }
}

/**
 * Creates a standard Web API TransformStream that transforms a stream of string chunks
 * into a stream of StreamSnapshot objects.
 *
 * Compatible with Node.js 18+, Bun, Deno, Cloudflare Workers, and modern browsers.
 *
 * @template T
 * @param {StreamJsonOptions} [options]
 * @returns {TransformStream<string, StreamSnapshot<T>>}
 *
 * @example
 * ```js
 * const stream = fetchResponse.body
 *   .pipeThrough(new TextDecoderStream())
 *   .pipeThrough(createJsonTransformStream());
 * ```
 */
export function createJsonTransformStream(options) {
  let accumulated = "";

  return new TransformStream({
    transform(chunk, controller) {
      if (!chunk) return;
      accumulated += chunk;

      try {
        const repaired = repairJson(accumulated, options);
        if (!repaired || repaired.trim().length === 0) return;

        let isComplete = false;
        try {
          JSON.parse(accumulated.trim());
          isComplete = true;
        } catch {
          isComplete = false;
        }

        const value = JSON.parse(repaired);

        controller.enqueue({
          raw: accumulated,
          repaired,
          value,
          isComplete,
        });
      } catch (err) {
        if (options?.onError) {
          options.onError(err instanceof Error ? err : new Error(String(err)), accumulated);
        }
      }
    },
  });
}
