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
import { logParseError } from "../logDiagnostics/logDiagnostics.js";
import { extractImportPath, normalizeImportPath } from "../utils/utils.js";
import { dependencyGraph } from "../cache/dependencyGraph.js";

export function scanFile(pugPath: string):{contract: ParsedContract | undefined,  errors: ParseError[]} {
  try {

    dependencyGraph.clear(pugPath);

    //console.info(`Running type-check for Pug file: ${pugPath}`);
    const pugSource = fs.readFileSync(pugPath, "utf8");
    const errors: ParseError[] = [];

    const {contract:contract, errors:contractErrors} = parseContractComments(pugPath, pugSource);
    if (!contract || contractErrors.length > 0) {
      errors.push(...contractErrors);
      Logger.debug(`❌ Errors found in ${pugPath}:`);
      
      return {contract:undefined, errors};
    }

    const {ast:ast, errors:precompileErrors} = precompilePug(pugPath, pugSource);
    errors.push(...precompileErrors);

    if (!ast) {
      Logger.error(`❌ Failed to precompile Pug file: ${pugPath}`);
      return {contract:contract, errors};
    }
    
    const tsResult = generateTsFromPugAst(ast, contract);

    Logger.debug(`✅ Generated TypeScript for ${pugPath}:`);

    let typescriptValidateErrors = validateGeneratedTs(tsResult.tsSource, tsResult.lineMap, pugPath);

    errors.push(...typescriptValidateErrors);


    return {contract, errors};
  } catch (err) {
    if (err instanceof ParseError) {
      return {contract:undefined, errors:[err]};
      //console.error(`❌ Parse failed:  ${err.message} at \n${err.pugPath}:${err.pugLine}` );
    } else {
      Logger.error("❌ General error during parsing:", err);
      return {contract:undefined, errors:[]};
    }
  }
}
const seen = new Set<string>();



export function scanAll(watcher?: FSWatcher): Map<string, ParseError[]> {
  const pugPaths = config.pugPaths.map((p) => path.resolve(config.projectPath, p));
  
  
  
  const result = new Map<string, ParseError[]>();
  seen.clear();
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
      const {contract, errors} = scanFile(pugFile);
      logParseError(errors, pugFile);
      result.set(pugFile, errors);
      seen.add(pugFile);
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
      
    }
    
    Logger.info(` Type-check completed for all Pug files in ${pugRoot}`);
    Logger.info()
   
  }
 return result;
}
