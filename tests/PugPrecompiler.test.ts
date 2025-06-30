import path from "node:path";
import { stringifyPugAst, precompilePug } from "../src/precompile/PugPrecompiler.js";

const pugFile = path.resolve("./tests/example-test-project/pug/sample.pug");

try {
  const result = precompilePug(pugFile);
  console.log("✅ Precompiled Source:");
  console.log(stringifyPugAst(result));

} catch (err) {
  console.error("❌ Precompiler error:", err);
}
