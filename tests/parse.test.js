import { describe, it, expect } from "vitest";
import { parsePartialJson, safeParsePartialJson } from "../src/parse.js";

describe("parsePartialJson", () => {
  it("parses valid JSON with correct structure", () => {
    const json = '{"name": "Ekansh", "age": 22, "roles": ["admin"]}';
    const result = parsePartialJson(json);
    expect(result).toBeDefined();
    expect(result.name).toBe("Ekansh");
    expect(result.age).toBe(22);
    expect(result.roles).toEqual(["admin"]);
  });

  it("parses incomplete JSON safely into JavaScript objects", () => {
    const partial = '{"name": "Ekansh", "roles": ["admin", "developer"';
    const result = parsePartialJson(partial);
    expect(result).toBeDefined();
    expect(result.name).toBe("Ekansh");
    expect(result.roles).toEqual(["admin", "developer"]);
  });

  it("returns undefined for empty input", () => {
    expect(parsePartialJson("")).toBeUndefined();
    expect(parsePartialJson("   ")).toBeUndefined();
  });
});

describe("safeParsePartialJson", () => {
  it("returns success: true with parsed data for valid or partial JSON", () => {
    const partial = '{"count": 42, "items": ["a", "b"';
    const res = safeParsePartialJson(partial);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.count).toBe(42);
      expect(res.data.items).toEqual(["a", "b"]);
    }
  });

  it("handles empty input gracefully", () => {
    const res = safeParsePartialJson("");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toBeUndefined();
    }
  });

  it("handles error in safeParsePartialJson when repair fails", () => {
    const res = safeParsePartialJson(undefined);
    expect(res.success).toBe(true);
  });
});
