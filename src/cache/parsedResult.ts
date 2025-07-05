import { log } from "node:console";
import type { ParseError } from "../errors/ParseError.js";
import type { ParsedContract } from "../types/types.js";
import { logParseError } from "../logDiagnostics/logDiagnostics.js";
import fs from "node:fs";
import { dependencyGraph } from "./dependencyGraph.js";
import type { PersistedData } from "./PersistedData.js";

import path from "node:path";
import { config } from "../config/config.js";
import { scanFile } from "../scanner/scanfiles.js";

interface ParseResult {
  errors: ParseError[];
  contract: ParsedContract | undefined;
  mtimeMs: number; // optional, used for checking if file is stale
}

class ParsedResultStore {
  private results = new Map<string, ParseResult>();

  set(file: string, errors: ParseError[], contract: ParsedContract | undefined) {
    let mtimeMs = 0;
    try {
      const stats = fs.statSync(file);
      mtimeMs = stats.mtimeMs;
    } catch (err) {
      console.warn(`Could not get mtime for ${file}, defaulting to 0`);
    }
    this.results.set(file, { errors, contract, mtimeMs });
  }

  get(file: string): ParseResult | undefined {
    return this.results.get(file);
  }

  clear(file: string) {
    this.results.delete(file);
  }

  clearAll() {
    this.results.clear();
  }

  logSummary() {
    for (const [file, result] of this.results.entries()) {
      console.log(`[${file}] -> ${result.errors.length} error(s)`);
    }
  }
  logErrors() {
    
    for (const [file, result] of this.results.entries()) {
      if (result.errors.length > 0) {
        console.log(`[${file}] -> ${result.errors.length} error(s)`);
      }

    }
    
  }
  logFull() {
    console.log("Full parse results log:");
    for (const [file, result] of this.results.entries()) {
      logParseError(result.errors, file);
    }
  }

  getAll(): Map<string, ParseResult> {
    return this.results;
  }

  save() {
    const filePath = path.join(config.projectPath, "/parseResults.json")
    const safeResults = Array.from(this.results.entries()).map(([file, result]) => {
      const safeErrors = result.errors.map((err) => ({
        ...err,
        diagnostic:undefined
      }));
      return [file, { ...result, errors: safeErrors }];
    });
    const persisted = {
      parseResults: safeResults,
      dependencyGraph: Array.from(
        dependencyGraph.graph.entries()
      ).map(([k, v]) => [k, Array.from(v)]),
    };

    fs.writeFileSync(filePath, JSON.stringify(persisted, null, 2), "utf8");
    console.log(`Saved parse results to ${filePath}`);
  }

  load() {
    const filePath = path.join(config.projectPath, "/parseResults.json")
    if (!fs.existsSync(filePath)) {
      console.warn(`No persisted data found at ${filePath}`);
      return;
    }

    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const persisted = JSON.parse(raw) as PersistedData;





      // restore parse results
      this.results = new Map(persisted.parseResults);

      // dependency graph is restored in your dependencyGraph module:
      for (const [file, deps] of persisted.dependencyGraph) {
        dependencyGraph.graph.set(file, new Set(deps));
      }

      console.log(`Loaded parse results from ${filePath}`);

      for (const [file, result] of this.getAll()) {
        try {
          const stats = fs.statSync(file);
          const currentMtime = stats.mtimeMs;
          if (currentMtime !== result.mtimeMs) {
            console.log(`[STALE] ${file} changed on disk, rescanning...`);
            const { contract, errors } = scanFile(file);
            if (errors.length > 0) {
              logParseError(errors, file);
            }else{
              console.log("No errors found, updated parse result");
            }
          } else {
            console.log(`[FRESH] ${file} is unchanged`);
          }
        } catch (err) {
          console.warn(`[MISSING] ${file} does not exist anymore, removing from parse results`);
          this.clear(file);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not parse persisted data, ignoring: ${err}`);
    }
  }
}

const parsedResultStore = new ParsedResultStore();
export { parsedResultStore, ParseResult, ParsedResultStore };