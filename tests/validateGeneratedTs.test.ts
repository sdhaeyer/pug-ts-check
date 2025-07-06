import fs from "fs";
import path from "path";
import { parseContract } from "../src/contracts/ContractParser.js";
import { precompilePug } from "../src/precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../src/tsgen/PugTsGenerator.js";
import { validateGeneratedTs } from "../src/validate/validateGeneratedTs.js";
import { Logger } from "../src/utils/Logger.js";
import { printWithLineNumbers } from "../src/utils/utils.js";
import { log } from "console";
import { logParseError } from "../src/logDiagnostics/logDiagnostics.js";
import { ParseError } from "../src/errors/ParseError.js";

try {
    Logger.info("🚀 validateGeneratedTs TEST STARTING");

    //const pugPath = path.resolve("./tests/example-test-project/pug/sample.pug");
    const pugPath = path.resolve("C:/Users/sam/Desktop/program-projects/srv/apps/string-portrait/code/src/views/string-portrait/view.pug");
    const pugSource = fs.readFileSync(pugPath, "utf8");
    const errors: ParseError[] = [];

    // parse the //@import + //@expect
    const {contract, errors: contractErrors} = parseContract(pugPath,pugSource);
    if (!contract) {
        Logger.error("❌ Contract parsing failed, no contract returned.");
        logParseError(contractErrors, pugPath);
        throw new Error("Contract parsing failed, no contract returned.");
    }
    // flatten the pug AST
    const {ast, errors: precompileErrors} = precompilePug(pugPath, pugSource);

    if(!ast) {
        Logger.error("❌ Precompilation failed, no AST returned.");
        logParseError(precompileErrors, pugPath);
        throw new Error("Precompilation failed, no AST returned.");
        
    }
    // generate TS
    const tsResult = generateTsFromPugAst(ast, contract);

    // Logger.info("✅ Generated TypeScript:");
    // printWithLineNumbers(tsResult.tsSource);

    // Logger.info("✅ Line Map:");
    let counter = 1;
    for (const entry of tsResult.lineMap) {
        // Logger.info(`line ${counter} -> Line ${entry.line} in file ${entry.file}`);
        counter++;
    }

    Logger.info("✅ Starting type-check validation...");

   const validationErrors = validateGeneratedTs( tsResult.tsSource, tsResult.lineMap, pugPath);

    errors.push(...contractErrors);
    errors.push(...precompileErrors);
    errors.push(...validationErrors);

    logParseError(errors, pugPath);
    Logger.info("✅ validateGeneratedTs test PASSED!");

} catch (err) {
    console.error("❌ validateGeneratedTs test FAILED:", err);
    process.exit(1);
}

