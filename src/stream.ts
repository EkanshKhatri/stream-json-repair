import { repairJson } from "./repair.js";
import type { StreamJsonOptions, StreamSnapshot } from "./types.js";

/**
 * Creates an AsyncGenerator that consumes chunks from an AsyncIterable<string>
 * and yields updated parsed snapshots as tokens stream in.
 *
 * @template T - The parsed object schema type.
 * @param asyncIterable - An async stream or generator of string chunks (e.g. OpenAI/Gemini/Fetch stream).
 * @param options - Stream repair options.
 *
 * @example
 * ```ts
 * for await (const snapshot of parseJsonStream<MySchema>(tokenChunks)) {
 *   console.log("Current object:", snapshot.value);
 * }
 * ```
 */
export async function* parseJsonStream<T = unknown>(
  asyncIterable: AsyncIterable<string>,
  options?: StreamJsonOptions
): AsyncGenerator<StreamSnapshot<T>, void, unknown> {
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

      const value = JSON.parse(repaired) as T;

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
 * into a stream of StreamSnapshot<T> objects.
 *
 * Compatible with Node.js 18+, Bun, Deno, Cloudflare Workers, and modern browsers.
 *
 * @example
 * ```ts
 * const stream = fetchResponse.body
 *   .pipeThrough(new TextDecoderStream())
 *   .pipeThrough(createJsonTransformStream<MyData>());
 * ```
 */
export function createJsonTransformStream<T = unknown>(
  options?: StreamJsonOptions
): TransformStream<string, StreamSnapshot<T>> {
  let accumulated = "";

  return new TransformStream<string, StreamSnapshot<T>>({
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

        const value = JSON.parse(repaired) as T;

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
