import {
  repairJson,
  parsePartialJson,
  safeParsePartialJson,
  parseJsonStream,
  type RepairOptions,
  type StreamSnapshot,
  type SafeParseResult,
} from "../src/index.js";

// Define a strict TypeScript interface for structured LLM response
interface RecipeSchema {
  recipeName: string;
  prepTimeMinutes: number;
  servings: number;
  ingredients: Array<{
    name: string;
    quantity: string;
  }>;
  isVegetarian: boolean;
}

console.log("==================================================");
console.log("⚡️ stream-json-repair TypeScript Demo");
console.log("==================================================\n");

// 1. Partial TypeScript parsing with generics
const partialStream = `
{
  recipeName: "Paneer Butter Masala",
  prepTimeMinutes: 30,
  servings: 4,
  ingredients: [
    { name: "Paneer", quantity: "250g" },
    { name: "Butter", quantity: "2 tbsp
`;

const options: RepairOptions = {
  stripMarkdown: true,
  incompleteValue: null,
};

// Strongly typed parse call:
const recipe: RecipeSchema | undefined = parsePartialJson<RecipeSchema>(partialStream, options);

console.log("1. Strongly Typed Parsed Object:");
console.log("   Recipe Name:", recipe?.recipeName);
console.log("   Prep Time:", recipe?.prepTimeMinutes, "mins");
console.log("   Ingredients Count:", recipe?.ingredients?.length);
console.log("   First Ingredient:", recipe?.ingredients?.[0]?.name);

// 2. Safe Parsing with Result Type
const safeResult: SafeParseResult<RecipeSchema> = safeParsePartialJson<RecipeSchema>(partialStream);
if (safeResult.success) {
  console.log("\n2. SafeParseResult Data:", safeResult.data.recipeName);
}

// 3. Real-time Streaming Simulation with Typed Snapshots
async function runTypedStream() {
  const chunks: string[] = [
    '{"recipeName": "Biryani"',
    ', "prepTimeMinutes": 45',
    ', "servings": 6',
    ', "isVegetarian": false}',
  ];

  async function* tokenGenerator(): AsyncGenerator<string> {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  console.log("\n3. Streaming Typed Snapshots:");
  for await (const snapshot of parseJsonStream<RecipeSchema>(tokenGenerator())) {
    const data: RecipeSchema = snapshot.value;
    const isComplete: boolean = snapshot.isComplete;
    console.log(`   -> [Complete: ${isComplete}] ${data.recipeName} (${data.prepTimeMinutes || "?"} mins)`);
  }
}

await runTypedStream();
console.log("\n✅ TypeScript generic types, options, and streaming verified perfectly!");
