// tests/PugTsGenerator.test.ts

import fs from "fs";
import path from "path";
import { parseContractComments } from "../src/contracts/ContractParser.js";
import { precompilePug, stringifyPugAst } from "../src/precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../src/tsgen/PugTsGenerator.js";
import { Logger } from "../src/utils/Logger.js";

try {
    const pugPath = path.resolve("./tests/example-test-project/pug/sample.pug");
    const pugSource = fs.readFileSync(pugPath, "utf8");

    const parsed = parseContractComments(pugPath, { projectPath: "./tests/example-test-project" }, pugSource);
    // precompile the sample pug to get a flat AST
    const ast = precompilePug(pugPath, pugSource);
    //console.log(stringifyPugAst(ast));

    // generate typescript from the flat AST
    const tsResult = generateTsFromPugAst(ast, parsed);

    Logger.info("✅ Generated TypeScript:");
    printWithLineNumbers(tsResult.tsSource);

    Logger.info("✅ Line Map:");
    let counter = 1;
    for (const entry of tsResult.lineMap) {
        Logger.info(`line ${counter} -> Line ${entry.line} in file ${entry.file}`);
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
