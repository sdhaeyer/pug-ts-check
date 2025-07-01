import fs from "node:fs";
import path from "node:path";
import { parseContractComments } from "../src/contracts/ContractParser.js";
import { ContractParseError } from "../src/errors/ContractParseError.js";


try {
    const parsed = parseContractComments("./tests/example-test-project/pug/sample.pug","",  {projectPath: "./tests/example-test-project"});
    console.log("✅ Parsed contract:");
    console.log(JSON.stringify(parsed, null, 2));
} catch (err) {
    if (err instanceof ContractParseError) {
    console.error("❌ Contract parse failed:", err.message);
  } else {
    console.error("❌ General error during parsing:", err);
  }
}
