import { describe, it, expect } from "vitest";
import { repairJson } from "../src/repair.js";

describe("repairJson", () => {
  describe("Basic & Valid JSON", () => {
    it("returns unchanged valid JSON objects", () => {
      const input = '{"name": "Alice", "age": 30}';
      expect(repairJson(input)).toBe(input);
    });

    it("returns unchanged valid JSON arrays", () => {
      const input = '[1, 2, 3, "four", true, null]';
      expect(repairJson(input)).toBe(input);
    });

    it("returns empty string for empty or whitespace input", () => {
      expect(repairJson("")).toBe("");
      expect(repairJson("   \n\t  ")).toBe("");
    });
  });

  describe("Unclosed Braces and Brackets", () => {
    it("closes single unclosed object", () => {
      expect(repairJson('{"name": "Alice"')).toBe('{"name": "Alice"}');
    });

    it("closes single unclosed array", () => {
      expect(repairJson('[1, 2, 3')).toBe("[1, 2, 3]");
    });

    it("closes deeply nested objects and arrays", () => {
      const input = '{"user": {"profile": {"skills": ["JavaScript", "Node.js"';
      const expected = '{"user": {"profile": {"skills": ["JavaScript", "Node.js"]}}}';
      expect(repairJson(input)).toBe(expected);
      expect(JSON.parse(repairJson(input))).toEqual({
        user: { profile: { skills: ["JavaScript", "Node.js"] } },
      });
    });

    it("handles bare opening brace and bracket", () => {
      expect(repairJson("{")).toBe("{}");
      expect(repairJson("[")).toBe("[]");
    });
  });

  describe("Unclosed Strings & Escaped Characters", () => {
    it("closes an unclosed string at EOF", () => {
      expect(repairJson('"hello world')).toBe('"hello world"');
    });

    it("handles escaped quotes inside truncated strings", () => {
      const input = '{"quote": "She said \\"Hello';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ quote: 'She said "Hello' });
    });

    it("handles trailing backslashes safely without breaking quotes", () => {
      const input = '{"path": "C:\\\\Windows\\\\';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ path: "C:\\Windows\\" });
    });

    it("autocompletes incomplete unicode escapes", () => {
      const input = '{"symbol": "\\u26';
      const repaired = repairJson(input);
      expect(() => JSON.parse(repaired)).not.toThrow();
    });
  });

  describe("Trailing Commas & Incomplete Properties", () => {
    it("removes trailing comma in objects", () => {
      const input = '{"a": 1, "b": 2, ';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ a: 1, b: 2 });
    });

    it("removes trailing comma in arrays", () => {
      const input = '["apple", "banana", ';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual(["apple", "banana"]);
    });

    it("fills value when key has a colon but no value yet", () => {
      const input = '{"status": "success", "data": ';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ status: "success", data: null });
    });

    it("handles incomplete key without colon", () => {
      const input = '{"id": 1, "description';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ id: 1, description: null });
    });
  });

  describe("Incomplete Literals & Numbers", () => {
    it("autocompletes true literal", () => {
      expect(repairJson('{"active": t')).toBe('{"active": true}');
      expect(repairJson('{"active": tr')).toBe('{"active": true}');
      expect(repairJson('{"active": tru')).toBe('{"active": true}');
    });

    it("autocompletes false literal", () => {
      expect(repairJson('{"active": f')).toBe('{"active": false}');
      expect(repairJson('{"active": fal')).toBe('{"active": false}');
    });

    it("autocompletes null literal", () => {
      expect(repairJson('{"data": n')).toBe('{"data": null}');
      expect(repairJson('{"data": nul')).toBe('{"data": null}');
    });

    it("repairs trailing decimal point in numbers", () => {
      const repaired = repairJson('{"pi": 3.');
      expect(JSON.parse(repaired)).toEqual({ pi: 3.0 });
    });

    it("repairs trailing negative sign in numbers", () => {
      const repaired = repairJson('{"temp": -');
      expect(JSON.parse(repaired)).toEqual({ temp: 0 });
    });

    it("repairs trailing scientific exponent in numbers", () => {
      const repaired = repairJson('{"rate": 1.5e+');
      expect(JSON.parse(repaired)).toEqual({ rate: 1.5 });
    });
  });

  describe("Markdown Code Blocks & Conversational LLM Prose", () => {
    it("strips opening and closing markdown fences", () => {
      const input = '```json\n{"message": "Hello from Gemini"}\n```';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ message: "Hello from Gemini" });
    });

    it("strips unclosed markdown code fence during streaming", () => {
      const input = '```json\n{"message": "Generating stream...';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ message: "Generating stream..." });
    });

    it("strips conversational introduction from LLMs before the JSON", () => {
      const input = 'Sure! Here is the response you asked for:\n{"success": true, "code": 200';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ success: true, code: 200 });
    });
  });

  describe("Single Quote Normalization", () => {
    it("converts single quotes to double quotes when normalizeQuotes is enabled", () => {
      const input = "{'key': 'value', 'nested': {'flag': true}}";
      const repaired = repairJson(input, { normalizeQuotes: true });
      expect(JSON.parse(repaired)).toEqual({ key: "value", nested: { flag: true } });
    });
  });

  describe("Comments & Extreme LLM Edge Cases", () => {
    it("safely strips single-line comments emitted by LLMs", () => {
      const input = '{\n  // User identifier\n  "id": 101,\n  "role": "admin"\n}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ id: 101, role: "admin" });
    });

    it("safely strips multi-line block comments", () => {
      const input = '{\n  /* Database record */\n  "score": 98.5\n}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ score: 98.5 });
    });

    it("handles emojis and UTF-8 multi-byte characters in streaming strings", () => {
      const input = '{"greeting": "Hello 🚀 World! Have a great day 🎉';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ greeting: "Hello 🚀 World! Have a great day 🎉" });
    });

    it("handles incomplete booleans and nulls inside arrays", () => {
      expect(JSON.parse(repairJson("[true, fal"))).toEqual([true, false]);
      expect(JSON.parse(repairJson("[1, 2, nu"))).toEqual([1, 2, null]);
    });

    it("handles stream of objects inside arrays", () => {
      const input = '[{"id": 1, "done": true}, {"id": 2, "name": "Work';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual([
        { id: 1, done: true },
        { id: 2, name: "Work" },
      ]);
    });

    it("handles negative exponent numbers", () => {
      const input = '{"val": 2.5e-';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ val: 2.5 });
    });

    it("handles nested code blocks embedded in prose", () => {
      const input = 'Explanation:\n```json\n{"data": [1, 2]}\n```\nExtra notes';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ data: [1, 2] });
    });

    it("handles multiple consecutive commas gracefully", () => {
      const input = '{"a": 1,,, "b": 2}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ a: 1, b: 2 });
    });
  });

  describe("Advanced Real-World Edge Cases", () => {
    it("repairs unquoted object keys", () => {
      const input = '{ name: "Ekansh", age: 24, is_admin: true }';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({
        name: "Ekansh",
        age: 24,
        is_admin: true,
      });
    });

    it("repairs incomplete unquoted object keys at stream EOF", () => {
      const input = '{ name: "Ekansh", tit';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({
        name: "Ekansh",
        tit: null,
      });
    });

    it("converts NaN and Infinity to valid JSON null", () => {
      const input = '{"score": NaN, "max": Infinity, "min": -Infinity}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({
        score: null,
        max: null,
        min: null,
      });
    });

    it("normalizes numbers with leading plus sign", () => {
      const input = '{"positive": +42, "temperature": +15.5}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({
        positive: 42,
        temperature: 15.5,
      });
    });

    it("converts hexadecimal numbers to decimal", () => {
      const input = '{"color": 0xFF, "port": 0x1F}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({
        color: 255,
        port: 31,
      });
    });

    it("handles trailing bare opening brace inside array", () => {
      const input = '[{"id": 1}, {';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual([{ id: 1 }, {}]);
    });

    it("handles trailing bare opening bracket inside object", () => {
      const input = '{"matrix": [[1, 2], [';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ matrix: [[1, 2], []] });
    });

    it("safely escapes unescaped raw control characters inside strings", () => {
      const input = '{"raw": "line 1\nline 2\ttabbed\bback"}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({
        raw: "line 1\nline 2\ttabbed\bback",
      });
    });

    it("handles double colons gracefully", () => {
      const input = '{"key":: "value"}';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ key: "value" });
    });

    it("strips trailing unclosed markdown backticks", () => {
      const input = '{"status": "ok"} ```';
      const repaired = repairJson(input);
      expect(JSON.parse(repaired)).toEqual({ status: "ok" });
    });
  });
});
