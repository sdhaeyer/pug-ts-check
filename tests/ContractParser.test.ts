import fs from "node:fs";
import path from "node:path";
import { parseContractComments } from "../src/contracts/ContractParser.js";
import { ContractParseError } from "../src/errors/ContractParseError.js";

const pugPath = path.resolve("./tests/example-test-project/pug/sample.pug");
const pugSource = fs.readFileSync(pugPath, "utf8");

try {
    const parsed = parseContractComments(pugSource, {projectPath: "./tests/example-test-project"});
    console.log("✅ Parsed contract:");
    console.log(JSON.stringify(parsed, null, 2));
} catch (err) {
    if (err instanceof ContractParseError) {
    console.error("❌ Contract parse failed:", err.message);
  } else {
    console.error("❌ General error during parsing:", err);
  }
}
