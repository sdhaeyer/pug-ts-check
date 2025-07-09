// tests/PugTsGenerator.test.ts

import fs from "fs";
import path from "path";
import { parseContract } from "../src/contracts/ContractParser.js";
import { precompilePug, stringifyPugAst } from "../src/precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../src/tsgen/PugTsGenerator.js";
import { Logger } from "../src/utils/Logger.js";
import { getProjectContext } from "../src/cache/project-context.js";
import { ParseError } from "../src/errors/ParseError.js";

try {
    const pugPath = path.resolve("./tests/example-test-project/pug/sample.pug");
    const pugSource = fs.readFileSync(pugPath, "utf8");
    const projectPath = "./tests/example-test-project";
    const errors:ParseError[] = [];

    const { contract, errors: contractErrors } = parseContract(pugPath,  pugSource);
    errors.push(...contractErrors);
    if (!contract) {
        Logger.error(`❌ Contract parsing failed, no contract returned for ${pugPath}`);
        throw new Error("Contract parsing failed, no contract returned.");
    }
    // precompile the sample pug to get a flat AST
    const { ast: ast, errors: precompileErrors } = precompilePug(pugPath, pugSource);
    errors.push(...precompileErrors);
    //console.log(stringifyPugAst(ast));

     if (!ast) {
      Logger.error(`❌ Failed to precompile Pug file: ${pugPath}`);
            throw new Error(`Precompilation failed, no AST returned.`);
    }

    // generate typescript from the flat AST
    const tsResult = generateTsFromPugAst(ast, contract , getProjectContext());

    Logger.info("✅ Generated TypeScript:");
    printWithLineNumbers(tsResult.tsSource);

    Logger.info("✅ Line Map:");
    let counter = 1;
    for (const entry of tsResult.lineMap) {
        Logger.info(`line ${counter} -> Line ${entry.lineNumber} in file ${entry.file}`);
        counter++;
    }

} catch (err) {
    console.error("❌ ERROR generating TS from pug AST:", err);
}


function printWithLineNumbers(source: string) {
  source.split("\n").forEach((line, idx) => {
    const lineNo = String(idx + 1).padStart(3, " ");
    console.log(`${lineNo}: ${line}`);
  });
}
