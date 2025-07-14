import path from "node:path";
import fs from "node:fs";


export function printWithLineNumbers(source: string) {
  source.split("\n").forEach((line, idx) => {
    const lineNo = String(idx + 1).padStart(3, " ");
    console.log(`${lineNo}: ${line}`);
  });
}





export function toAbsolute(inlinePath: string, fromFile: string): string {
  return Path.resolve(Path.dirname(fromFile), inlinePath);
}



export function normalizeImportPath(importPath: string | null): string {
  if (!importPath) {
    return "";
  }
  let resolved = importPath;

  // strip .js if present
  if (resolved.endsWith(".js")) {
    resolved = resolved.slice(0, -3);
  }

  // resolve to absolute .ts file (assuming source is .ts)
  if (fs.existsSync(resolved + ".ts")) {
    resolved += ".ts";
  } else if (fs.existsSync(resolved + ".d.ts")) {
    resolved += ".d.ts";
  }

  return path.normalize(resolved);
}

export function extractNames(expectText: string): string[] {
  const raw = expectText.trim().slice(1, -1) // remove the surrounding { }
  const splitted = splitTopLevel(raw, ",");

  return splitted.map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => {
      const [name] = part.split(":", 2); // nicely split only the first colon
      return name.trim().replace(/\?$/, "");
    });
}

export class Path {
  static normalize(p: string): string {
    p = path.posix.normalize(p.replace(/\\/g, "/"));
    return p;
  }

  static resolve(...paths: string[]): string {
    return Path.normalize(path.resolve(...paths));
  }

  static relative(from: string, to: string): string {
    return Path.normalize(path.relative(Path.normalize(from), Path.normalize(to)));
  }

  static dirname(p: string): string {
    return Path.normalize(path.dirname(p));
  }

  static basename(p: string): string {
    return path.basename(p);
  }
  static isAbsolute(p: string): boolean {
    return path.isAbsolute(p);
  }
}


export function parseExpects(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const trimmed = raw.trim().replace(/^{|}$/g, "").trim();
  if (!trimmed) return result;

  const entries = splitTopLevel(trimmed, ",");

  for (const entry of entries) {
    const [key, type] = splitTopLevel(entry, ":");
    if (!key) {
      result[entry.trim()] = "any"; // fallback
    } else {
      result[key.trim()] = type.trim();
    }
  }
  return result;
}

export function splitTopLevel(input: string, delimiter: string): string[] {
  if (delimiter.length !== 1) {
    throw new Error(`splitTopLevel expects a single-character delimiter. Got: "${delimiter}"`);
  }

  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // Check if part of "=>"
    if (char === ">" && input[i - 1] === "=") {
      current += char;
      continue;
    }

    if ("<({[".includes(char)) {
      depth++;
    } else if (">)}]".includes(char)) {
      depth--;
    } else if (char === delimiter && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());

  if (depth !== 0) {
    throw new Error("Unbalanced delimiters in splitTopLevel input");
  }
  return parts;
}