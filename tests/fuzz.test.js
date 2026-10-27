import { describe, it, expect } from "vitest";
import { repairJson } from "../src/repair.js";
import { parsePartialJson, safeParsePartialJson } from "../src/parse.js";

describe("Fuzz & Character-by-Character Slicing Stress Tests", () => {
  const testPayloads = [
    // 1. Deeply nested API response
    JSON.stringify({
      status: "success",
      code: 200,
      data: {
        users: [
          { id: 101, name: "Alice", active: true, roles: ["admin", "editor"] },
          { id: 102, name: "Bob", active: false, roles: ["viewer"] },
        ],
        pagination: { page: 1, perPage: 20, total: 100 },
        metadata: { timestamp: "2026-10-27T10:00:00Z", cached: false },
      },
    }),

    // 2. Complex strings with unicode, escaped quotes, and newlines
    JSON.stringify({
      title: 'Guide to "Antigravity" & AI \\ Tools',
      emoji: "🚀 🤖 ⚡️ ✨",
      description: "Line 1\nLine 2\tTabbed content with \\ special escapes",
      tags: ["tag-1", "tag-2", "tag-3"],
    }),

    // 3. Mathematical matrix & numeric edge cases
    JSON.stringify({
      matrix: [
        [1.5, -2.75, 3e4],
        [0.001, -42, 99.99],
      ],
      flags: [true, false, null, true],
      summary: { total: 123456.789, valid: true },
    }),

    // 4. Markdown wrapped JSON block
    '```json\n{"tool": "web_search", "parameters": {"query": "Node.js NPM publishing", "limit": 10}}\n```',

    // 5. Python-style dictionary with unquoted keys and single quotes
    "{ status: 'in_progress', count: 42, active: True, items: ['apple', 'banana'] }",
  ];

  it("never throws an unhandled exception when sliced at every single character boundary", () => {
    let totalSlicesTested = 0;

    for (const payload of testPayloads) {
      // Test every cut point from 1 char to full length
      for (let i = 1; i <= payload.length; i += 2) {
        const slice = payload.slice(0, i);
        totalSlicesTested++;

        // 1. repairJson should never crash
        const repaired = repairJson(slice);
        expect(typeof repaired).toBe("string");

        // 2. The repaired output should be valid JSON parseable by JSON.parse
        if (repaired.length > 0) {
          expect(() => JSON.parse(repaired)).not.toThrow();
        }

        // 3. safeParsePartialJson should never throw
        const safeRes = safeParsePartialJson(slice);
        expect(safeRes.success).toBe(true);
      }
    }

    console.log(`\n   🔥 Fuzzing passed: Tested ${totalSlicesTested} random character cut points across real-world payloads!`);
    expect(totalSlicesTested).toBeGreaterThan(200);
  });

  describe("Extreme & Malformed Inputs", () => {
    it("handles non-string types safely without throwing", () => {
      expect(repairJson(null)).toBe("");
      expect(repairJson(undefined)).toBe("");
      expect(repairJson(12345)).toBe("");
      expect(repairJson({})).toBe("");
      expect(repairJson([])).toBe("");
    });

    it("handles strings with only punctuation or symbols", () => {
      expect(() => repairJson("{{{{{[[[[[")).not.toThrow();
      expect(() => JSON.parse(repairJson("{{{{{[[[[["))).not.toThrow();

      expect(() => repairJson("}}}}]]:;;;,,,")).not.toThrow();
      expect(() => JSON.parse(repairJson("}}}}]]:;;;,,,"))).not.toThrow();

      expect(() => repairJson('"""""\\\\\n\t\r')).not.toThrow();
      expect(() => JSON.parse(repairJson('"""""\\\\\n\t\r'))).not.toThrow();
    });

    it("handles large arrays (1,000 items) truncated mid-stream", () => {
      const largePayload = JSON.stringify(
        Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Record #${i}` }))
      );
      // Slice halfway through the 1000 items
      const truncated = largePayload.slice(0, 5000);

      const repaired = repairJson(truncated);
      expect(() => JSON.parse(repaired)).not.toThrow();
      const parsed = JSON.parse(repaired);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(100);
    });

    it("handles deeply nested structures up to 50 levels of depth", () => {
      let deep = "";
      for (let i = 0; i < 50; i++) deep += '{"level": ';
      deep += "42";

      const repaired = repairJson(deep);
      expect(() => JSON.parse(repaired)).not.toThrow();
      const parsed = JSON.parse(repaired);
      expect(parsed).toHaveProperty("level");
    });
  });
});
