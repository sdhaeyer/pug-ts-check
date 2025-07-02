import path from "node:path";
import fs from "node:fs";
import { parseContractComments } from "../contracts/ContractParser.js";
import { precompilePug } from "../precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../tsgen/pugTsGenerator.js";
import { validateGeneratedTs } from "../validate/validateGeneratedTs.js";
import { Logger } from "../utils/Logger.js";
import { ParseError } from "../errors/ParseError.js";   

export function runTypeCheck(pugPath: string, projectPath: string) {
  try {
    const pugSource = fs.readFileSync(pugPath, "utf8");
    const contract = parseContractComments(pugPath, pugSource, { projectPath });

    const ast = precompilePug(pugPath, pugSource);
    const tsResult = generateTsFromPugAst(ast, contract);

    Logger.debug(`✅ Generated TypeScript for ${path.basename(pugPath)}:`);

    let diags = validateGeneratedTs(tsResult.tsSource, tsResult.lineMap, { projectPath });
    if (diags.length > 0) {
      Logger.error(`❌ ${path.basename(pugPath)} failed type-check!`);
    } else {
      Logger.info(`✅ ${path.basename(pugPath)} passed type-check!`);
    }
  } catch (err) {
    if (err instanceof ParseError) {
      console.error(`❌ Parse failed ${pugPath} - projectpath ${projectPath}: `, err.message);
    } else {
      console.error("❌ General error during parsing:", err);
    }
  }
}
