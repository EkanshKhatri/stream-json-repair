# Changelog

All notable changes to `stream-json-repair` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-27

### Added
- **Core Engine:** Incremental state machine for repairing truncated, partial, or malformed JSON strings.
- **Auto-Completion:**
  - Auto-closes unterminated strings safely, handling dangling backslashes and partial Unicode escapes (`\uXXXX`).
  - Auto-closes unclosed object braces (`}`) and array brackets (`]`) across arbitrary nesting depths.
  - Autocompletes trailing booleans (`true`, `false`) and `null` literals.
  - Repairs incomplete numbers (e.g., trailing decimal points `12.` or scientific notation `1e+`).
  - Synthesizes values for trailing object colons (`{"key": ` -> `{"key": null}`).
  - Strips illegal trailing commas before closing braces/brackets.
- **LLM & Markdown Integration:**
  - Automatic extraction and stripping of markdown code fences (````json ... ````).
  - Strips leading conversational prose emitted by LLMs prior to the JSON payload.
  - Safely strips single-line (`//`) and multi-line (`/* */`) comments.
  - Python-style single quote normalization to standard double quotes.
- **Streaming Support:**
  - `parseJsonStream`: Async generator for consuming token streams from OpenAI, Gemini, Claude, or Ollama.
  - `createJsonTransformStream`: Standard Web API `TransformStream` for direct piping with `fetch()` and `ReadableStream`.
- **Developer Experience:**
  - 100% TypeScript with dual ESM (`.js`) and CommonJS (`.cjs`) builds + full `.d.ts` declaration files.
  - Zero runtime dependencies (< 3 KB footprint).
  - 94%+ test coverage with 42 automated test suites in Vitest.
  - Benchmarks demonstrating >140,000 ops/sec throughput.
