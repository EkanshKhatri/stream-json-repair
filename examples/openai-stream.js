import { parseJsonStream } from "../src/index.js";

/**
 * Example demonstrating how stream-json-repair integrates with
 * streaming LLM token chunks (OpenAI, Anthropic Claude, Google Gemini, Ollama).
 */
async function main() {
  console.log("Simulating real-time AI token stream (Pure JavaScript)...\n");

  // Simulated token chunks arriving over a network connection
  const tokenChunks = [
    'Sure! Here is the generated recipe:\n```json\n',
    '{"title": "Paneer Tikka',
    '", "prep_time_minutes": 25',
    ', "servings": 4',
    ', "ingredients": ["Paneer", "Bell Pepper',
    '", "Yogurt", "Garam Masala"]',
    ', "instructions": ["Marinate',
    ' cubes for 30 mins", "Grill on skewers"]',
    '}\n```',
  ];

  async function* simulateNetworkStream() {
    for (const chunk of tokenChunks) {
      await new Promise((res) => setTimeout(res, 50)); // simulate network latency
      yield chunk;
    }
  }

  let step = 1;
  for await (const snapshot of parseJsonStream(simulateNetworkStream())) {
    console.log(`[Token #${step++}] Status: ${snapshot.isComplete ? "COMPLETE" : "STREAMING"}`);
    console.log("Live State:", JSON.stringify(snapshot.value));
    console.log("-----------------------------------------------------------------");
  }

  console.log("\n🎉 Stream fully parsed and completed!");
}

main().catch(console.error);
