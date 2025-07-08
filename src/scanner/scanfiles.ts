import path, { parse } from "node:path";
import fs from "node:fs";
import { parseContract } from "../contracts/ContractParser.js";
import { precompilePug } from "../precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../tsgen/pugTsGenerator.js";
import { validateGeneratedTs } from "../validate/validateGeneratedTs.js";
import { Logger } from "../utils/Logger.js";
import { ParseError } from "../errors/ParseError.js";
import { config } from "../config/config.js";
import { glob } from "glob";
import { FSWatcher } from "chokidar";
import { ParsedContract } from "../types/types.js";
import { logParseError } from "../logDiagnostics/logDiagnostics.js";
import { normalizeImportPath } from "../utils/utils.js";
import { dependencyGraph } from "../cache/dependencyGraph.js";
import { parsedResultStore } from "../cache/parsedResult.js";

import { lastScannedFile } from "../cache/lastScannedFile.js";
import { generateViewLocals } from "../tsgen/generateViewLocals.js";
import { getPugTsConfigPath } from "../config/loadPugConfig.js";

export function scanFile(pugPath: string, watcher?: FSWatcher): { contract: ParsedContract | undefined, errors: ParseError[], rawGeneratedTs?: string } {
  lastScannedFile.path = pugPath;

  dependencyGraph.clear(pugPath);
  parsedResultStore.clear(pugPath);
  const errors: ParseError[] = [];
  try {



    //console.info(`Running type-check for Pug file: ${pugPath}`);
    const pugSource = fs.readFileSync(pugPath, "utf8");

    Logger.info("Getting contract")
    const { contract: contract, errors: contractErrors } = parseContract(pugPath, pugSource);
    if (!contract || contractErrors.length > 0) {
      errors.push(...contractErrors);
      Logger.debug(`❌ Errors found in ${pugPath}:`);
      parsedResultStore.set(pugPath, errors, contract);
      return { contract: undefined, errors };
    }
    // console.log(`✅ xxxxx Parsed contract for ${pugPath}:`);
    // console.log(contract)

    Logger.info("Getting AST")
    const { ast: ast, errors: precompileErrors } = precompilePug(pugPath, pugSource);
    errors.push(...precompileErrors);

    if (!ast) {
      Logger.error(`❌ Failed to precompile Pug file: ${pugPath}`);
      parsedResultStore.set(pugPath, errors, contract);
      return { contract: contract, errors };
    }

    Logger.info("Generating TypeScript");
    const tsResult = generateTsFromPugAst(ast, contract);

    Logger.debug(`✅ Generated TypeScript for ${pugPath}:`);

    Logger.info("Validating TypeScript");
    let typescriptValidateErrors = validateGeneratedTs(tsResult.tsSource, tsResult.lineMap, pugPath);

    errors.push(...typescriptValidateErrors);

    parsedResultStore.set(pugPath, errors, contract);

    if (watcher && contract) {
      for (const imp of contract.imports) {
        const importPath = normalizeImportPath(imp.getAbsolutePath());
        if (importPath && !seen.has(importPath)) {
          watcher.add(importPath);
          Logger.info(`-> Added import to watcher! ${importPath}`);
          seen.add(importPath);
        }

      }
    }

    return { contract, errors, rawGeneratedTs: tsResult.tsSource };
  } catch (err) {
    if (err instanceof ParseError) {
      errors.push(err);
      parsedResultStore.set(pugPath, errors, undefined);
      return { contract: undefined, errors };
      //console.error(`❌ Parse failed:  ${err.message} at \n${err.pugPath}:${err.pugLine}` );
    } else {
      const pErr = new ParseError(`GeneralParseError: ${err instanceof Error ? err.message : "Unknown error"}`, pugPath, 1);
      errors.push(pErr);
      Logger.error("❌ General error during parsing:", err);
      parsedResultStore.set(pugPath, errors, undefined);
      return { contract: undefined, errors };
    }
  }
}
const seen = new Set<string>();



export function scanNewAndChanged(watcher?: FSWatcher):void  {
  const pugPaths = config.pugPaths.map((p) => path.resolve(config.projectPath, p));
  parsedResultStore.markStaleFiles()

  for (const pugRoot of pugPaths) {
    let pugFiles: string[] = [];
    if (!fs.existsSync(pugRoot)) {

      throw new Error(`❌ Looking at pugPaths...\n [${pugPaths}] \n  Pugroot does not exist:\n  ${pugRoot}\n  Please check your configuration...  \n  ${getPugTsConfigPath()} \n Pugpaths must be relative to the projectpath given.`);
    }

    if (!fs.statSync(pugRoot).isDirectory()) {
      pugFiles = [pugRoot];
    } else {
      pugFiles = glob.sync("**/*.pug", {
        cwd: pugRoot,
        absolute: true,
      });
    }



    if (pugFiles.length === 0) {
      Logger.warn(`No Pug files found in ${pugRoot}, pug paths in config are relative to projectPath: ${config.projectPath}`);
    }
    for (const pugFile of pugFiles) {
      const existing = parsedResultStore.get(pugFile);
      let needsRescan = false;

      if (!existing) {
        needsRescan = true;
      } else {
        needsRescan = existing.stale;
      }
      if (needsRescan) {
        const { contract, errors } = scanFile(pugFile, watcher);
        
      }
    }
    Logger.info(` Type-check completed for all changed Pug files in ${pugRoot}`);
    if(!parsedResultStore.hasErrors()) {
      generateViewLocals();
    }

  }
  
}
