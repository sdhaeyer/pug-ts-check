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





export function toAbsolute(inlinePath: string , fromFile: string): string  {
  return  Path.resolve(Path.dirname(fromFile), inlinePath);
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

export class Path{
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
}