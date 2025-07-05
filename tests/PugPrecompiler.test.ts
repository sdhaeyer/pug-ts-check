import path from "node:path";
import { stringifyPugAst, precompilePug } from "../src/precompile/PugPrecompiler.js";
import { Logger } from "../src/utils/Logger.js";
import { logParseError } from "../src/logDiagnostics/logDiagnostics.js";
import { log } from "node:console";


// const pugFile = path.resolve("./tests/example-test-project/pug/sample.pug");
// const pugFile = path.resolve("C:/Users/sam/Desktop/program-projects/srv/apps/string-portrait/code/src/views/pages/browse.pug");
const pugFile = path.resolve("C:/Users/sam/Desktop/program-projects/srv/apps/string-portrait/code/src/views/string-portrait/view.pug");
try {
  Logger.setLevel("debug");
  Logger.info("🚀 Pug Precompiler Test Starting");
  Logger.info(`📄 Precompiling Pug file: ${pugFile}`);  
  const {ast, errors} = precompilePug(pugFile);
  Logger.info("✅ Precompiled Source:");
  if (!ast){
    logParseError(errors, pugFile);
    throw new Error("Precompilation failed, no AST returned.");
  }
  Logger.info(stringifyPugAst(ast));
  logParseError(errors, pugFile);

} catch (err) {
  console.error("❌ Precompiler error:", err);
}
