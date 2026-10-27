# ⚡ stream-json-repair

> **Ultra-fast, zero-dependency streaming JSON parser & repair engine for LLM token streams (OpenAI, Gemini, Claude, Ollama) that auto-completes incomplete JSON in real-time.**

[![npm version](https://img.shields.io/npm/v/stream-json-repair?color=blue&style=flat-square)](https://www.npmjs.com/package/stream-json-repair)
[![license](https://img.shields.io/npm/l/stream-json-repair?style=flat-square)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/stream-json-repair?style=flat-square&color=success)](https://bundlephobia.com/package/stream-json-repair)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![coverage](https://img.shields.io/badge/coverage-94%25-brightgreen?style=flat-square)](./tests)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](#)

---

## 🌟 Why stream-json-repair?

When building modern AI applications with **OpenAI**, **Anthropic Claude**, **Google Gemini**, or **local models (Ollama, vLLM)**, streaming structured outputs (JSON) is critical for responsive user experiences.

However, native `JSON.parse()` crashes immediately whenever a token stream is incomplete:
```ts
JSON.parse('{"user": {"name": "Alice"'); 
// ❌ SyntaxError: Unexpected end of JSON input
```

Traditional workarounds either wait until the entire generation finishes (defeating the purpose of streaming) or use bulky AST compilers that choke on partial tokens.

**`stream-json-repair` solves this problem with an incremental lexical state machine:**
* ✅ **Dual TypeScript & JavaScript Support:** Written in strict TypeScript with full generic typings, built into dual ESM (`dist/index.js`) and CommonJS (`dist/index.cjs`) bundles.
* ✅ **Real-Time Streaming:** Repairs truncated JSON token-by-token so your UI can render live cards, tables, or progress indicators instantly.
* ✅ **Zero Dependencies:** Pure self-contained code, zero external runtime packages, and < 4 KB gzipped.
* ✅ **Ultra-Fast:** Over **140,000 ops/sec** (~7 µs per repair) in production benchmarks.
* ✅ **Full Type Safety:** Ships with full `.d.ts` declaration files for perfect autocompletion in VS Code, WebStorm, and TypeScript projects.
* ✅ **Handles LLM Quirks:** Automatically strips ````json ```` fences, leading conversational text, unquoted keys, `NaN`/`Infinity`, Python-style single quotes, comments, and unclosed Unicode escapes.

---

## 📦 Installation

```bash
# Using npm
npm install stream-json-repair

# Using pnpm
pnpm add stream-json-repair

# Using yarn
yarn add stream-json-repair

# Using bun
bun add stream-json-repair
```

---

## 🚀 Quickstart

### 1. Repairing a Truncated JSON String
```ts
// ESM / TypeScript
import { repairJson } from "stream-json-repair";

// CommonJS
// const { repairJson } = require("stream-json-repair");

const partial = '{"title": "Paneer Tikka", "tags": ["Indian", "Vegetarian';
const validJson = repairJson(partial);

console.log(validJson);
// 👉 Output: {"title": "Paneer Tikka", "tags": ["Indian", "Vegetarian"]}
```

### 2. Type-Safe Partial Parsing
```ts
import { parsePartialJson } from "stream-json-repair";

interface Recipe {
  title: string;
  tags: string[];
}

const recipe = parsePartialJson<Recipe>('{"title": "Paneer Tikka", "tags": ["Indian"');

console.log(recipe?.title); // "Paneer Tikka"
console.log(recipe?.tags);  // ["Indian"]
```

### 3. Streaming AI Token Chunks (OpenAI / Gemini / Ollama)
```ts
import { parseJsonStream } from "stream-json-repair";

// Any AsyncIterable<string> of chunks (e.g. from OpenAI stream or fetch reader)
async function renderLiveResponse(tokenStream: AsyncIterable<string>) {
  for await (const snapshot of parseJsonStream<Recipe>(tokenStream)) {
    console.log("Status:", snapshot.isComplete ? "Done" : "Generating...");
    console.log("Current state:", snapshot.value);
    
    // Update your React / Svelte / Vue state in real-time!
    // updateUI(snapshot.value);
  }
}
```

### 4. Direct Web Stream Integration (`TransformStream`)
```ts
import { createJsonTransformStream } from "stream-json-repair";

const response = await fetch("/api/ai-completion", { method: "POST" });

const liveStream = response.body!
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(createJsonTransformStream<Recipe>());

const reader = liveStream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log("Stream update:", value.value);
}
```

---

## 📖 Complete API Reference

### `repairJson(input: string, options?: RepairOptions): string`
Takes a raw or incomplete JSON string and synthesizes a 100% syntactically valid JSON string.

* **Parameters:**
  * `input` (`string`): The raw partial JSON string to repair.
  * `options` (`RepairOptions`, optional): Configuration options.
* **Returns:** `string` (A valid JSON string that passes `JSON.parse()`).

---

### `parsePartialJson<T = unknown>(input: string, options?: RepairOptions): T | undefined`
Repairs and directly parses the string into a typed JavaScript value.

* **Parameters:**
  * `input` (`string`): The raw partial JSON string.
  * `options` (`RepairOptions`, optional): Configuration options.
* **Returns:** `T | undefined` (The parsed value, or `undefined` if input is empty).

---

### `safeParsePartialJson<T = unknown>(input: string, options?: RepairOptions): SafeParseResult<T>`
Safe wrapper around `parsePartialJson` that never throws.

* **Returns:**
  * `{ success: true, data: T }` if parsed successfully.
  * `{ success: false, error: Error }` if unrecoverable.

---

### `parseJsonStream<T = unknown>(asyncIterable: AsyncIterable<string>, options?: StreamJsonOptions): AsyncGenerator<StreamSnapshot<T>>`
Consumes an asynchronous generator or stream of string chunks and yields continuously updated partial objects.

* **Yields:** `StreamSnapshot<T>`:
  * `raw`: The raw cumulative text received so far.
  * `repaired`: The valid repaired JSON string.
  * `value`: The parsed JavaScript object of type `T`.
  * `isComplete`: Boolean flag indicating if the model has closed all tags without synthetic repair.

---

### Configuration Options (`RepairOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `stripMarkdown` | `boolean` | `true` | Strips ````json ```` fences and leading conversational text from LLMs. |
| `incompleteValue` | `any` | `null` | Value assigned when a key ends with a colon without value (e.g. `{"key": `). |
| `normalizeQuotes`| `boolean` | `true` | Converts Python-style single quotes to standard JSON double quotes. |

---

## 🛡️ Edge Cases Handled

| Scenario | Input | Repaired Output |
| :--- | :--- | :--- |
| **Unquoted Object Keys** | `'{ name: "Alice", age: 30 }'` | `'{"name": "Alice", "age": 30}'` |
| **Incomplete Unquoted Key** | `'{ name: "Alice", tit'` | `'{"name": "Alice", "tit": null}'` |
| **NaN & Infinity** | `'{"score": NaN, "limit": Infinity}'` | `'{"score": null, "limit": null}'` |
| **Leading Plus on Numbers** | `'{"temp": +25.5}'` | `'{"temp": 25.5}'` |
| **Hexadecimal Numbers** | `'{"color": 0xFF, "port": 0x1F}'` | `'{"color": 255, "port": 31}'` |
| **Unclosed strings** | `'{"name": "Alice'` | `'{"name": "Alice"}'` |
| **Escaped quotes** | `'{"bio": "Software \"eng'` | `'{"bio": "Software \"eng"}'` |
| **Trailing backslashes** | `'{"path": "C:\\\\Windows\\\\'` | `'{"path": "C:\\\\Windows\\\\"}'` |
| **Incomplete Unicode** | `'{"icon": "\\u27'` | `'{"icon": "\\u2700"}'` |
| **Trailing commas** | `'[1, 2, 3, '` | `'[1, 2, 3]'` |
| **Incomplete booleans** | `'{"active": tru'` | `'{"active": true}'` |
| **Incomplete nulls** | `'{"data": nul'` | `'{"data": null}'` |
| **Incomplete numbers** | `'{"rate": 12.'` | `'{"rate": 12.0}'` |
| **Trailing colons** | `'{"user": '` | `'{"user": null}'` |
| **Trailing open containers** | `'[{"id": 1}, {'` | `'[{"id": 1}, {}]'` |
| **Control chars in strings** | `'{"msg": "line 1\nline 2"}'` (raw) | `'{"msg": "line 1\\nline 2"}'` |
| **Duplicate colons / commas**| `'{"key":: "val",,, "b": 1}'` | `'{"key": "val", "b": 1}'` |
| **Markdown blocks** | ```` ```json\n{"val": 1} ```` | `'{"val": 1}'` |
| **Conversational prose** | `'Sure! Here is the JSON: {"a": 1'` | `'{"a": 1}'` |
| **Trailing backticks** | `'{"status": "ok"} ```'` | `'{"status": "ok"}'` |

---

## ⚡ Performance Benchmark

Benchmarked on Apple M-series hardware using Node.js v24 (`npm run bench`):

| Test Scenario | Iterations | Latency (µs / op) | Throughput |
| :--- | :--- | :--- | :--- |
| **Deeply Nested Object** | 20,000 | **7.54 µs** | **132,564 ops/sec** |
| **Streaming Array of Objects** | 20,000 | **6.95 µs** | **143,929 ops/sec** |
| **Markdown Code Fence Strip** | 20,000 | **7.15 µs** | **139,810 ops/sec** |
| **Large Incomplete Dataset (100 items)** | 20,000 | **124.48 µs** | **8,034 ops/sec** |

---

## ⚠️ Limitations

* **Heuristic Field Guessing:** If a model truncates mid-number (`1`), the parser reads `1`. When the next token `2` arrives, it updates to `12`. Design your UI state with this streaming nature in mind.
* **Corrupted UTF-8 Bytes:** If raw byte streams are split across multi-byte character boundaries, pipe through `TextDecoderStream` first before passing text to `stream-json-repair`.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and typecheck (`npm test && npm run typecheck`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for details.

Developed with ❤️ by **[Ekansh Khatri](https://github.com/ekanshkhatri)**.
