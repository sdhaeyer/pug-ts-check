
import type { ParseError } from "../errors/ParseError.js";
import { ParsedContract } from "../types/types.js";
import { logParseError } from "../logDiagnostics/logDiagnostics.js";
import fs from "node:fs";
import { dependencyGraph } from "./dependencyGraph.js";
import type { PersistedData } from "./PersistedData.js";

import path from "node:path";
import { config } from "../config/config.js";
import { scanFile } from "../scanner/scanfiles.js";
import { Logger } from "../utils/Logger.js";
import { Path } from "../utils/utils.js";

interface ParseResult {
  errors: ParseError[];
  contract: ParsedContract | undefined;
  mtimeMs: number; // optional, used for checking if file is stale
  stale: boolean;
}

class ParsedResultStore {
  private results = new Map<string, ParseResult>();

  set(file: string, errors: ParseError[], contract: ParsedContract | undefined, stale = false) {
    let mtimeMs = 0;
    try {
      const stats = fs.statSync(file);
      mtimeMs = stats.mtimeMs;
    } catch (err) {
      Logger.warn(`Could not get mtime for ${file}, defaulting to 0`);
    }

    this.results.set(Path.normalize(file), { errors, contract, mtimeMs, stale: false });
  }

  get(file: string): ParseResult | undefined {
    return this.results.get(Path.normalize(file));
  }
  setStale(file: string, stale: boolean) {
    const result = this.get(file);
    if (result) {
      result.stale = stale;
    }
  }
  hasStale(): boolean {
    for (const result of this.results.values()) {
      if (result.stale) {
        return true;
      }
    }
    return false;
  }
  clear(file: string) {
    this.results.delete(Path.normalize(file));
  }

  clearAll() {
    this.results.clear();
  }


  logSummary() {
    // counting errors in amount off files... 
    let totalErrors = 0;
    let totalerrorFiles = 0;
    let totalFiles = 0;
    for (const [file, result] of this.results.entries()) {
      totalFiles++;
      if (result.errors.length > 0) {
        totalerrorFiles++;
        totalErrors += result.errors.length;
      }
    }

    if (totalErrors === 0) {
      Logger.info("No errors found in parse results.");
    } else {
      Logger.info(`Found ${totalErrors} errors in ${totalerrorFiles} files.`);
    }
    Logger.info(`Total files scanned: ${totalFiles}`);

  }
  logSummaryAll() {
    for (const [file, result] of this.results.entries()) {
      Logger.info(`[${file}] -> ${result.errors.length} error(s)`);
    }
  }
  logErrors() {
    let foundErro = false
    for (const [file, result] of this.results.entries()) {
      if (result.errors.length > 0) {
        foundErro = true
        Logger.info(`[${file}] -> ${result.errors.length} error(s)`);
      }

    }
    if (!foundErro) {
      Logger.info("No errors found in parse results.");
    }

  }
  logFull() {
    Logger.info("Full parse results log:");
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
        diagnostic: undefined
      }));
      return [Path.normalize(file), { ...result, errors: safeErrors }];
    });
    const persisted = {
      parseResults: safeResults,
      dependencyGraph: Array.from(
        dependencyGraph.graph.entries()
      ).map(([k, v]) => [k, Array.from(v)]),
    };

    fs.writeFileSync(filePath, JSON.stringify(persisted, null, 2), "utf8");
    Logger.info(`Saved parse results to ${filePath}`);
  }

  load() {
    const filePath = path.join(config.projectPath, "/parseResults.json")
    if (!fs.existsSync(filePath)) {
      Logger.warn(`No persisted data found at ${filePath}`);
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

      Logger.info(`Loaded parse results from ${filePath}`);

      for (const [file, result] of this.getAll()) {
        if (result.contract) {
          result.contract = ParsedContract.rehydrate(result.contract);
        }

      }
      this.markStaleFiles();
    } catch (err) {
      throw new Error(`⚠️ Could not parse persisted data, ignoring: ${err}`);
    }
  }

  markStaleFiles() {
    for (const [file, result] of this.getAll()) {
      try {
        const currentMtime = fs.statSync(file).mtimeMs;
        if (currentMtime !== result.mtimeMs) {
          Logger.info(`[STALE] ${file} changed on disk, marking for rescan`);
          result.stale = true; // or add to a Set of dirty files
        }
      } catch {
        Logger.warn(`[MISSING] ${file} does not exist anymore, removing from store`);
        this.clear(file);
      }
    }
    this.markStaleDependents();
  }

  markStaleDependents() {
    for (const [file, result] of this.getAll()) {
      if (result && result.stale && result.contract && result.contract.pugPath) {
        dependencyGraph.getDependentsOf(result.contract.pugPath).forEach((dep) => {
          const depResult = this.get(dep);
          if (depResult) {
            depResult.stale = true;
            Logger.info(`[STALE] Marking dependent ${dep} as stale due to changes in ${file}`);
          } else {
            Logger.warn(`[MISSING] Dependent ${dep} not found in store, cannot mark as stale`);
          }
        });
      }
    }
  }

  hasErrors(): boolean {
    for (const result of this.results.values()) {
      if (result.errors.length > 0) {
        return true;
      }
    }
    return false;
  }
}



const parsedResultStore = new ParsedResultStore();
export { parsedResultStore, ParseResult, ParsedResultStore };








function test(file: string, result: ParseResult) {
  try {
    const stats = fs.statSync(file);
    const currentMtime = stats.mtimeMs;
    if (currentMtime !== result.mtimeMs) {
      Logger.info(`[STALE] ${file} changed on disk, rescanning...`);
      const { contract, errors } = scanFile(file);
      if (errors.length > 0) {
        logParseError(errors, file);
      } else {
        Logger.info("No errors found, updated parse result");
      }
    } else {
      // Logger.info(`[FRESH] ${file} is unchanged`);
    }
  } catch (err) {
    Logger.warn(`[MISSING] ${file} does not exist anymore, removing from parse results`);
    // OPGEPAST COMMENTED  this.clear(file);
  }
}