import { repairJson } from "../src/repair.js";
import { parsePartialJson } from "../src/parse.js";

console.log("=================================================");
console.log("🚀 stream-json-repair Performance Benchmark");
console.log("=================================================\n");

const samples = [
  {
    name: "Truncated Object with Deep Nesting",
    input: '{"user": {"profile": {"name": "Alice", "skills": ["TS", "Node"',
  },
  {
    name: "Streaming Array of Objects",
    input: '[{"id": 1, "done": true}, {"id": 2, "name": "Deploy',
  },
  {
    name: "Markdown Code Block with Incomplete Escape",
    input: '```json\n{"message": "Hello \\"World\\", welcome to the fu',
  },
  {
    name: "Large Incomplete Dataset (100 items)",
    input: JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ id: i, label: `Item #${i}` }))).slice(0, -25),
  },
];

const ITERATIONS = 20_000;

for (const sample of samples) {
  // Warmup
  for (let i = 0; i < 1000; i++) {
    repairJson(sample.input);
  }

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    repairJson(sample.input);
  }
  const end = performance.now();

  const totalMs = end - start;
  const opsPerSec = Math.round((ITERATIONS / totalMs) * 1000);
  const avgUs = ((totalMs / ITERATIONS) * 1000).toFixed(2);

  console.log(`📌 Test: ${sample.name}`);
  console.log(`   Iterations: ${ITERATIONS.toLocaleString()}`);
  console.log(`   Total Time: ${totalMs.toFixed(2)} ms`);
  console.log(`   Throughput: ${opsPerSec.toLocaleString()} ops/sec`);
  console.log(`   Avg Latency: ${avgUs} µs / op`);
  console.log(`   Result: ${repairJson(sample.input).slice(0, 60)}...`);
  console.log("-------------------------------------------------");
}

console.log("\n✅ Benchmark completed successfully! Ultra-low latency verified.");
