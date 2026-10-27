import { describe, it, expect } from "vitest";
import { parsePartialJson, safeParsePartialJson } from "../src/parse.js";

interface UserProfile {
  name: string;
  age?: number;
  roles: string[];
  metadata?: {
    verified: boolean;
  };
}

describe("parsePartialJson", () => {
  it("parses valid JSON with correct TypeScript types", () => {
    const json = '{"name": "Ekansh", "age": 22, "roles": ["admin"]}';
    const result = parsePartialJson<UserProfile>(json);
    expect(result).toBeDefined();
    expect(result?.name).toBe("Ekansh");
    expect(result?.age).toBe(22);
    expect(result?.roles).toEqual(["admin"]);
  });

  it("parses incomplete JSON safely into typed objects", () => {
    const partial = '{"name": "Ekansh", "roles": ["admin", "developer"';
    const result = parsePartialJson<UserProfile>(partial);
    expect(result).toBeDefined();
    expect(result?.name).toBe("Ekansh");
    expect(result?.roles).toEqual(["admin", "developer"]);
  });

  it("returns undefined for empty input", () => {
    expect(parsePartialJson("")).toBeUndefined();
    expect(parsePartialJson("   ")).toBeUndefined();
  });
});

describe("safeParsePartialJson", () => {
  it("returns success: true with parsed data for valid or partial JSON", () => {
    const partial = '{"count": 42, "items": ["a", "b"';
    const res = safeParsePartialJson<{ count: number; items: string[] }>(partial);
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
    // If parse throws
    const res = safeParsePartialJson(undefined as any);
    expect(res.success).toBe(true);
  });
});
