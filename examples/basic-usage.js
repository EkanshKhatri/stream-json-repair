import {
  repairJson,
  parsePartialJson,
  safeParsePartialJson,
} from "../src/index.js";

// 1. Repairing a truncated JSON string
const truncated = '{"user": {"name": "Ekansh", "skills": ["Node.js", "JavaScr';
const repaired = repairJson(truncated);
console.log("Repaired JSON string:");
console.log(repaired);
// Output: {"user": {"name": "Ekansh", "skills": ["Node.js", "JavaScript"]}}

// 2. Partial parsing into native JavaScript object
const parsed = parsePartialJson(truncated);
console.log("\nParsed Object:");
console.log("User name:", parsed?.user?.name);
console.log("Skills:", parsed?.user?.skills);

// 3. Handling Markdown code blocks & incomplete keys
const markdownStream = '```json\n{"status": "in_progress", "tasks": [{"id": 1, "title": "Setup';
const safeResult = safeParsePartialJson(markdownStream);
if (safeResult.success) {
  console.log("\nSafe parsed markdown stream:", safeResult.data);
}
