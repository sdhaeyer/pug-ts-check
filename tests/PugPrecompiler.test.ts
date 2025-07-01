import path from "node:path";
import { stringifyPugAst, precompilePug } from "../src/precompile/PugPrecompiler.js";
import { Logger } from "../src/utils/Logger.js";

const pugFile = path.resolve("./tests/example-test-project/pug/sample.pug");

try {
  Logger.info("🚀 Pug Precompiler Test Starting");
  Logger.info(`📄 Precompiling Pug file: ${pugFile}`);
  const result = precompilePug(pugFile);
  Logger.info("✅ Precompiled Source:");
  Logger.info(stringifyPugAst(result));

} catch (err) {
  console.error("❌ Precompiler error:", err);
}
