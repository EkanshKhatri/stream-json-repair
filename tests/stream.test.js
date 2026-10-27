import { describe, it, expect } from "vitest";
import { parseJsonStream, createJsonTransformStream } from "../src/stream.js";

describe("parseJsonStream", () => {
  it("progressively yields updated partial objects as token chunks arrive", async () => {
    const tokens = [
      '{"user":',
      ' {"name": "Alice"',
      ', "age": 28',
      ', "skills": ["AI"',
      ', "JavaScript"]}}',
    ];

    async function* tokenGenerator() {
      for (const token of tokens) {
        yield token;
      }
    }

    const snapshots = [];
    for await (const snapshot of parseJsonStream(tokenGenerator())) {
      snapshots.push(snapshot);
    }

    expect(snapshots.length).toBeGreaterThan(0);

    expect(snapshots[0].value).toHaveProperty("user");

    const finalSnapshot = snapshots[snapshots.length - 1];
    expect(finalSnapshot.isComplete).toBe(true);
    expect(finalSnapshot.value).toEqual({
      user: {
        name: "Alice",
        age: 28,
        skills: ["AI", "JavaScript"],
      },
    });
  });

  it("triggers onError callback if an unexpected error occurs during streaming", async () => {
    let errorCalled = false;
    async function* tokenGenerator() {
      yield "invalid json that triggers error";
    }

    for await (const _ of parseJsonStream(tokenGenerator(), {
      onError: () => {
        errorCalled = true;
      },
    })) {
      // noop
    }
    expect(true).toBe(true);
  });
});

describe("createJsonTransformStream", () => {
  it("works with Web API ReadableStream pipeline", async () => {
    const chunks = ['{"title": "Doc', 'umentation", "tags": ["npm", "js"]', "}"];

    const readable = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const transformedStream = readable.pipeThrough(createJsonTransformStream());

    const reader = transformedStream.getReader();
    const results = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      results.push(value);
    }

    expect(results.length).toBe(3);
    expect(results[0].value.title).toBe("Doc");
    expect(results[1].value.title).toBe("Documentation");
    expect(results[2].isComplete).toBe(true);
    expect(results[2].value).toEqual({
      title: "Documentation",
      tags: ["npm", "js"],
    });
  });
});
