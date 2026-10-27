/**
 * Options for repairing JSON strings.
 */
export interface RepairOptions {
  /**
   * If true (default: true), automatically strips markdown code blocks,
   * e.g., ```json ... ``` or leading conversational prose from LLMs.
   */
  stripMarkdown?: boolean;

  /**
   * Value to assign when an object key has a trailing colon but no value yet.
   * E.g. `{"user": ` becomes `{"user": null}`. Default is `null`.
   */
  incompleteValue?: any;

  /**
   * If true (default: true), converts single quotes to valid double quotes
   * for keys and string values (useful for Python-style LLM outputs).
   */
  normalizeQuotes?: boolean;
}

/**
 * Options for streaming JSON transformation and parsing.
 */
export interface StreamJsonOptions extends RepairOptions {
  /**
   * Optional custom error handler when a chunk cannot be repaired.
   */
  onError?: (error: Error, rawChunk: string) => void;
}

/**
 * Result returned by the streaming transformer.
 */
export interface StreamSnapshot<T = unknown> {
  /**
   * The raw accumulated text received so far.
   */
  raw: string;

  /**
   * The repaired, valid JSON string.
   */
  repaired: string;

  /**
   * The parsed JavaScript object/array/primitive.
   */
  value: T;

  /**
   * True if the JSON structure is completely closed and valid without synthetic repairs.
   */
  isComplete: boolean;
}

/**
 * Result returned by safe parsing.
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Repairs a truncated, partial, or malformed JSON string into valid parseable JSON.
 */
export function repairJson(input: string, options?: RepairOptions): string;

/**
 * Repairs and parses an incomplete or streaming JSON string into a typed JavaScript object/value.
 */
export function parsePartialJson<T = unknown>(
  input: string,
  options?: RepairOptions
): T | undefined;

/**
 * Safely parses an incomplete or streaming JSON string without throwing errors.
 */
export function safeParsePartialJson<T = unknown>(
  input: string,
  options?: RepairOptions
): SafeParseResult<T>;

/**
 * Creates an AsyncGenerator that consumes chunks from an AsyncIterable<string>
 * and yields updated parsed snapshots as tokens stream in.
 */
export function parseJsonStream<T = unknown>(
  asyncIterable: AsyncIterable<string>,
  options?: StreamJsonOptions
): AsyncGenerator<StreamSnapshot<T>, void, unknown>;

/**
 * Creates a standard Web API TransformStream that transforms a stream of string chunks
 * into a stream of StreamSnapshot<T> objects.
 */
export function createJsonTransformStream<T = unknown>(
  options?: StreamJsonOptions
): TransformStream<string, StreamSnapshot<T>>;
