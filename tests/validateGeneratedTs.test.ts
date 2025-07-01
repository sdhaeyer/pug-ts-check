import fs from "fs";
import path from "path";
import { parseContractComments } from "../src/contracts/ContractParser.js";
import { precompilePug } from "../src/precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../src/tsgen/PugTsGenerator.js";
import { validateGeneratedTs } from "../src/validate/validateGeneratedTs.js";
import { Logger } from "../src/utils/Logger.js";
import { printWithLineNumbers } from "../src/utils/utils.js";

try {
    Logger.info("🚀 validateGeneratedTs TEST STARTING");

    const pugPath = path.resolve("./tests/example-test-project/pug/sample.pug");
    const pugSource = fs.readFileSync(pugPath, "utf8");

    // parse the //@import + //@expect
    const contract = parseContractComments(pugPath,pugSource, { projectPath: "./tests/example-test-project" } );

    // flatten the pug AST
    const ast = precompilePug(pugPath, pugSource);

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

    validateGeneratedTs(
        tsResult.tsSource,
        tsResult.lineMap,
        { projectPath: "./tests/example-test-project" }
    );

    Logger.info("✅ validateGeneratedTs test PASSED!");

} catch (err) {
    console.error("❌ validateGeneratedTs test FAILED:", err);
    process.exit(1);
}

