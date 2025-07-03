import path from "node:path";
import fs from "node:fs";
import { parseContractComments } from "../contracts/ContractParser.js";
import { precompilePug } from "../precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../tsgen/pugTsGenerator.js";
import { validateGeneratedTs } from "../validate/validateGeneratedTs.js";
import { Logger } from "../utils/Logger.js";
import { ParseError } from "../errors/ParseError.js";
import { config } from "../config/config.js";
import { glob } from "glob";
import { FSWatcher } from "chokidar";
import { ParsedContract } from "../types/types.js";

export function runTypeCheck(pugPath: string):ParsedContract | undefined {
  try {
    //console.info(`Running type-check for Pug file: ${pugPath}`);
    const pugSource = fs.readFileSync(pugPath, "utf8");
    
    const contract = parseContractComments(pugPath, pugSource);
    
    const ast = precompilePug(pugPath, pugSource);
    const tsResult = generateTsFromPugAst(ast, contract);

    Logger.debug(`✅ Generated TypeScript for ${pugPath}:`);

    let diags = validateGeneratedTs(tsResult.tsSource, tsResult.lineMap, pugPath);
    if (diags.length > 0) {
      Logger.error(`❌ ${pugPath} --failed type-check!`);
    } else {
      Logger.info(`✅ ${path.basename(pugPath)} passed type-check!`);
    }
    return contract;
  } catch (err) {
    if (err instanceof ParseError) {
      Logger.error(`ERROR: ${err.pugPath}:${err.pugLine} \n -> ${err.message}`);
      //console.error(`❌ Parse failed:  ${err.message} at \n${err.pugPath}:${err.pugLine}` );
    } else {
      Logger.error("❌ General error during parsing:", err);
    }
  }
}
const seen = new Set<string>();



export function reScanAll(watcher?: FSWatcher) {
  const pugPaths = config.pugPaths.map((p) => path.resolve(config.projectPath, p));

  for (const pugRoot of pugPaths) {
    let pugFiles: string[] = [];

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
      var contract = runTypeCheck(pugFile);
      
      if( watcher && contract) {
        for (const absImport of contract.absoluteImports) {
          const importPath = normalizeImportPath(extractImportPath(absImport));
          if (importPath && !seen.has(importPath)) {
            watcher.add(importPath);
            Logger.info(`-> Added dependency: ${importPath}`);
            seen.add(importPath);
          }

        }
      }
      if (contract?.errors && contract.errors.length > 0) {
        Logger.error(`❌ Errors found in ${pugFile}:`);
        Logger.error(contract.errors);
        break;
      }
    }
    Logger.info(` Type-check completed for all Pug files in ${pugRoot}`);
  }

}

export function extractImportPath(importLine: string): string | null {
  const match = importLine.match(/from\s+["']([^"']+)["']/);
  return match ? match[1] : null;
}

function normalizeImportPath(importPath: string| null): string {
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