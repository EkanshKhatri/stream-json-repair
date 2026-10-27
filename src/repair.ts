import type { RepairOptions } from "./types.js";

const DEFAULT_OPTIONS: Required<RepairOptions> = {
  stripMarkdown: true,
  incompleteValue: null,
  normalizeQuotes: true,
};

/**
 * Repairs a truncated, partial, or malformed JSON string into valid parseable JSON.
 *
 * @param input - The raw or streaming JSON string to repair.
 * @param options - Customization options for stripping markdown, fallback values, etc.
 * @returns A guaranteed valid JSON string that can be parsed with `JSON.parse()`.
 */
export function repairJson(input: string, options?: RepairOptions): string {
  const opts: Required<RepairOptions> = { ...DEFAULT_OPTIONS, ...options };

  if (!input || typeof input !== "string") {
    return "";
  }

  let text = input.trim();
  if (text.length === 0) {
    return "";
  }

  // 1. Strip markdown fences or leading LLM conversational prose
  if (opts.stripMarkdown) {
    text = extractJsonFromMarkdown(text);
  }

  if (text.length === 0) {
    return "";
  }

  // Quick check: if already valid JSON, return directly
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue with state machine repair
  }

  return runStateMachineRepair(text, opts);
}

/**
 * Extracts JSON content if wrapped in markdown code blocks or preceded by LLM explanations.
 */
function extractJsonFromMarkdown(text: string): string {
  let cleaned = text.trim();

  // Strip trailing markdown backticks if any (e.g. from stream interruption)
  cleaned = cleaned.replace(/`+$/, "").trim();

  // Handle opening markdown code fences like ```json, ```JSON, or ```
  const codeBlockMatch = cleaned.match(/^```(?:json|JSON)?\s*([\s\S]*)$/);
  if (codeBlockMatch && codeBlockMatch[1] !== undefined) {
    cleaned = codeBlockMatch[1].trim();
    const closingFenceIndex = cleaned.lastIndexOf("```");
    if (closingFenceIndex !== -1) {
      cleaned = cleaned.substring(0, closingFenceIndex).trim();
    }
    return cleaned;
  }

  // Check if LLM emitted prose before the first '{' or '['
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let firstJsonStart = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    firstJsonStart = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    firstJsonStart = firstBrace;
  } else if (firstBracket !== -1) {
    firstJsonStart = firstBracket;
  }

  // Check if LLM emitted conversational text before a markdown block
  const fenceIndex = cleaned.indexOf("```");
  if (fenceIndex !== -1 && (firstJsonStart === -1 || fenceIndex < firstJsonStart)) {
    const afterFence = cleaned.substring(fenceIndex);
    const innerMatch = afterFence.match(/^```(?:json|JSON)?\s*([\s\S]*)$/);
    if (innerMatch && innerMatch[1] !== undefined) {
      let blockContent = innerMatch[1].trim();
      const endFence = blockContent.lastIndexOf("```");
      if (endFence !== -1) {
        blockContent = blockContent.substring(0, endFence).trim();
      }
      return blockContent;
    }
  }

  if (firstJsonStart > 0) {
    cleaned = cleaned.substring(firstJsonStart).trim();
  }

  // Strip trailing unclosed markdown backticks if any
  cleaned = cleaned.replace(/`+$/, "").trim();

  return cleaned;
}

/**
 * State machine parser that tracks brackets, strings, escapes, and literals
 * to synthesize a complete and valid JSON document.
 */
function runStateMachineRepair(text: string, opts: Required<RepairOptions>): string {
  let result = "";
  const stack: Array<"{" | "["> = [];

  let inString = false;
  let stringQuoteChar: '"' | "'" = '"';
  let isEscaped = false;
  let lastNonWhitespace = "";

  const len = text.length;
  let i = 0;

  while (i < len) {
    const char = text[i]!;

    // Inside a string literal
    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === "\\") {
        result += char;
        isEscaped = true;
      } else if (char === stringQuoteChar) {
        inString = false;
        result += '"';
        lastNonWhitespace = '"';
      } else {
        if (char === '"' && stringQuoteChar === "'") {
          result += '\\"';
        } else if (char === "\n") {
          result += "\\n";
        } else if (char === "\r") {
          result += "\\r";
        } else if (char === "\t") {
          result += "\\t";
        } else if (char === "\b") {
          result += "\\b";
        } else if (char === "\f") {
          result += "\\f";
        } else if (char.charCodeAt(0) < 0x20) {
          result += "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
        } else {
          result += char;
        }
      }
      i++;
      continue;
    }

    // Outside string: handle comments
    if (char === "/" && i + 1 < len) {
      const nextChar = text[i + 1];
      if (nextChar === "/") {
        i += 2;
        while (i < len && text[i] !== "\n" && text[i] !== "\r") {
          i++;
        }
        continue;
      } else if (nextChar === "*") {
        i += 2;
        while (i + 1 < len && !(text[i] === "*" && text[i + 1] === "/")) {
          i++;
        }
        i += 2;
        continue;
      }
    }

    // Skip whitespace
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      result += char;
      i++;
      continue;
    }

    // Handle leading '+' on numbers: e.g. +42 -> 42
    if (char === "+" && i + 1 < len && /[0-9]/.test(text[i + 1]!)) {
      i++;
      continue;
    }

    // Handle NaN -> null
    if (char === "N" && text.substring(i, i + 3) === "NaN") {
      result += "null";
      lastNonWhitespace = "l";
      i += 3;
      continue;
    }

    // Handle Infinity or -Infinity -> null
    if (char === "I" && text.substring(i, i + 8) === "Infinity") {
      if (result.trimEnd().endsWith("-")) {
        result = result.trimEnd().slice(0, -1);
      }
      result += "null";
      lastNonWhitespace = "l";
      i += 8;
      continue;
    }

    // Handle Hexadecimal numbers: e.g. 0xFF -> 255
    if (char === "0" && i + 1 < len && (text[i + 1] === "x" || text[i + 1] === "X")) {
      const hexMatch = text.substring(i).match(/^0[xX][0-9a-fA-F]+/);
      if (hexMatch) {
        const hexStr = hexMatch[0];
        const decVal = parseInt(hexStr, 16);
        result += decVal;
        lastNonWhitespace = String(decVal).slice(-1);
        i += hexStr.length;
        continue;
      }
    }

    // Start of string
    if (char === '"' || (char === "'" && opts.normalizeQuotes)) {
      inString = true;
      stringQuoteChar = char as '"' | "'";
      result += '"';
      lastNonWhitespace = '"';
      i++;
      continue;
    }

    // Object and array openers
    if (char === "{") {
      stack.push("{");
      result += "{";
      lastNonWhitespace = "{";
      i++;
      continue;
    }

    if (char === "[") {
      stack.push("[");
      result += "[";
      lastNonWhitespace = "[";
      i++;
      continue;
    }

    // Object and array closers
    if (char === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") {
        stack.pop();
        result = removeTrailingComma(result);
        result += "}";
        lastNonWhitespace = "}";
      }
      i++;
      continue;
    }

    if (char === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") {
        stack.pop();
        result = removeTrailingComma(result);
        result += "]";
        lastNonWhitespace = "]";
      }
      i++;
      continue;
    }

    // Key-value separator: ignore duplicate colons e.g. `::`
    if (char === ":") {
      if (lastNonWhitespace !== ":") {
        result += ":";
        lastNonWhitespace = ":";
      }
      i++;
      continue;
    }

    // Element/property separator: ignore duplicate commas e.g. `,,`
    if (char === ",") {
      if (lastNonWhitespace !== "{" && lastNonWhitespace !== "[" && lastNonWhitespace !== ",") {
        result += ",";
        lastNonWhitespace = ",";
      }
      i++;
      continue;
    }

    // Handle Unquoted Object Keys: e.g. `{ name: "Bob" }` or `{ age:`
    if (
      stack.length > 0 &&
      stack[stack.length - 1] === "{" &&
      (lastNonWhitespace === "{" || lastNonWhitespace === ",") &&
      /[a-zA-Z_$]/.test(char)
    ) {
      let keyIdent = "";
      while (i < len && /[a-zA-Z0-9_$-]/.test(text[i]!)) {
        keyIdent += text[i]!;
        i++;
      }

      // Peek next non-whitespace char
      let peekIdx = i;
      while (peekIdx < len && (text[peekIdx] === " " || text[peekIdx] === "\t" || text[peekIdx] === "\n" || text[peekIdx] === "\r")) {
        peekIdx++;
      }

      // If followed by ':' or at EOF, wrap as a quoted key!
      if (peekIdx >= len || text[peekIdx] === ":") {
        result += '"' + keyIdent + '"';
        lastNonWhitespace = '"';
        continue;
      } else {
        result += keyIdent;
        lastNonWhitespace = keyIdent.slice(-1);
        continue;
      }
    }

    // Literals, numbers, or unfinished identifiers
    result += char;
    lastNonWhitespace = char;
    i++;
  }

  // --- REPAIR PASS AT END OF STREAM (EOF) ---

  // 1. If EOF happened inside an unclosed string
  if (inString) {
    result = closeUnterminatedString(result, isEscaped);
    inString = false;
  }

  // 2. Check for truncated literals (true, false, null) or numbers at the end
  result = autocompleteTrailingLiteral(result);

  // 3. If there is a colon waiting for a value (e.g. `{"key": `)
  const trimmed = result.trimEnd();
  if (trimmed.endsWith(":")) {
    const valString = JSON.stringify(opts.incompleteValue);
    result = trimmed + " " + valString;
  }

  // 4. Remove any trailing comma (e.g. `{"a": 1, ` or `[1, 2, `)
  result = removeTrailingComma(result);

  // 5. If we ended with an unclosed key without colon: `{"a": 1, "b`
  // which got closed to `{"a": 1, "b"`
  result = fixUnfinishedObjectProperty(result, stack, opts);

  // 6. Close all remaining unclosed containers from the stack
  while (stack.length > 0) {
    const top = stack.pop()!;
    result = removeTrailingComma(result);
    if (top === "{") {
      result += "}";
    } else if (top === "[") {
      result += "]";
    }
  }

  // Final validation and safety catch
  try {
    JSON.parse(result);
    return result;
  } catch (err) {
    // If standard parsing still fails, apply aggressive emergency fixes
    return fallbackEmergencyRepair(result);
  }
}

/**
 * Closes an unclosed string safely, handling trailing single backslashes
 * and incomplete Unicode escapes (\uXXXX).
 */
function closeUnterminatedString(str: string, endsWithBackslash: boolean): string {
  if (endsWithBackslash) {
    str += "\\";
  } else {
    const unicodeMatch = str.match(/\\u([0-9a-fA-F]{0,3})$/);
    if (unicodeMatch && unicodeMatch[1] !== undefined) {
      const missingZeros = 4 - unicodeMatch[1].length;
      str += "0".repeat(missingZeros);
    }
  }
  return str + '"';
}

/**
 * Autocompletes trailing incomplete numbers or boolean/null literals.
 */
function autocompleteTrailingLiteral(str: string): string {
  const trailingWord = str.match(/([a-zA-Z]+)$/);
  if (trailingWord && trailingWord[1]) {
    const word = trailingWord[1];
    if ("true".startsWith(word)) {
      return str.slice(0, -word.length) + "true";
    }
    if ("false".startsWith(word)) {
      return str.slice(0, -word.length) + "false";
    }
    if ("null".startsWith(word)) {
      return str.slice(0, -word.length) + "null";
    }
    if ("NaN".startsWith(word)) {
      return str.slice(0, -word.length) + "null";
    }
  }

  const trailingNum = str.match(/([0-9]+[eE][+-]?|-?[0-9]+\.|\s-)$/);
  if (trailingNum && trailingNum[1]) {
    const fragment = trailingNum[1].trim();
    if (fragment === "-") {
      return str.slice(0, -fragment.length) + "0";
    }
    if (fragment.endsWith(".")) {
      return str + "0";
    }
    if (fragment.toLowerCase().endsWith("e") || fragment.toLowerCase().endsWith("e+") || fragment.toLowerCase().endsWith("e-")) {
      return str + "0";
    }
  }

  return str;
}

/**
 * Removes trailing commas outside of strings.
 */
function removeTrailingComma(str: string): string {
  let end = str.length - 1;
  while (end >= 0 && (str[end] === " " || str[end] === "\t" || str[end] === "\n" || str[end] === "\r")) {
    end--;
  }
  if (end >= 0 && str[end] === ",") {
    return str.substring(0, end);
  }
  return str;
}

/**
 * If an object ends with a closed key string but no colon (e.g. `{"user": "Alice", "bio"` -> `{"user": "Alice", "bio"}`),
 * complete it with a colon and the incompleteValue.
 */
function fixUnfinishedObjectProperty(
  str: string,
  stack: Array<"{" | "[">,
  opts: Required<RepairOptions>
): string {
  if (stack.length === 0 || stack[stack.length - 1] !== "{") {
    return str;
  }

  const trimmed = str.trimEnd();
  const keyOnlyMatch = trimmed.match(/([{,]\s*)"([^"\\]*(?:\\.[^"\\]*)*)"\s*$/);
  if (keyOnlyMatch) {
    const valString = JSON.stringify(opts.incompleteValue);
    return trimmed + ": " + valString;
  }

  return str;
}

/**
 * Fallback repair in case exotic nesting or edge syntax caused a parse error.
 */
function fallbackEmergencyRepair(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str));
  } catch {
    let openBraces = 0;
    let openBrackets = 0;
    let inStr = false;

    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === '"' && (i === 0 || str[i - 1] !== "\\")) {
        inStr = !inStr;
      } else if (!inStr) {
        if (c === "{") openBraces++;
        else if (c === "}") openBraces = Math.max(0, openBraces - 1);
        else if (c === "[") openBrackets++;
        else if (c === "]") openBrackets = Math.max(0, openBrackets - 1);
      }
    }

    let fixed = str;
    if (inStr) fixed += '"';
    fixed = removeTrailingComma(fixed);
    while (openBraces > 0) {
      fixed += "}";
      openBraces--;
    }
    while (openBrackets > 0) {
      fixed += "]";
      openBrackets--;
    }

    try {
      JSON.parse(fixed);
      return fixed;
    } catch {
      if (str.trim().startsWith("[")) return "[]";
      return "{}";
    }
  }
}
