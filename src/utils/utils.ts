import path from "node:path";
import {config} from "../config/config.js";
import { Logger } from "./Logger.js";
import fs from "node:fs";
import { get } from "node:http";

export function printWithLineNumbers(source: string) {
  source.split("\n").forEach((line, idx) => {
    const lineNo = String(idx + 1).padStart(3, " ");
    console.log(`${lineNo}: ${line}`);
  });
}




export function rebaseImport( importLine: string, pugFilePath: string) : string | undefined {

  const absoluteTarget = getAbsoluteTarget(importLine, pugFilePath);
  if (!absoluteTarget) {
    return undefined; // leave untouched if cannot parse
  }
  const absoluteTmp = path.resolve(config.projectPath, config.tmpDir);
  // now make a relative path from tmpDir to the target
  const relativeToTmp = Path.relative(absoluteTmp, absoluteTarget);
  
  return replaceTarget(importLine, relativeToTmp);
}

export function absoluteImport( importLine: string, pugFilePath: string ): string | undefined {
  const absoluteTarget = getAbsoluteTarget(importLine, pugFilePath);
  if (!absoluteTarget) {
    return undefined; // leave untouched if cannot parse
  }
  return replaceTarget(importLine,absoluteTarget);
}


export function getAbsoluteTarget( importLine: string, pugFilePath: string ): string| undefined {
  const originalPath = getTarget(importLine); // this will normalize slashes
  if (!originalPath) {
   return undefined;
  }
  const pugDir = path.dirname(pugFilePath);
  const absoluteTarget = path.resolve(pugDir, originalPath);
  
  return Path.normalize(absoluteTarget)
}

export function replaceTarget(importLine: string, newTarget: string): string {
    return importLine.replace(
        /(from\s+["'])([^"']+)(["'])/,
        (_match, prefix, _originalPath, suffix) => `${prefix}${newTarget}${suffix}`
    );
}







export function getTarget( importLine: string ): string | undefined {
  const match = importLine.match(/from\s+["']([^"']+)["']/);
  if (!match) {
    return undefined; // leave untouched if cannot parse
  }
  const originalPath = match[1];


  return Path.normalize(originalPath); // normalize to forward slashes
}


export function normalizeImportPath(importPath: string| null): string {
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

class Path{
  static normalize(p: string): string {
    return p.replace(/\\/g, "/");
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
}