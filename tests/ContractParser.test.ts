import fs from "node:fs";
import path from "node:path";
import { parseContract } from "../src/contracts/ContractParser.js";
import { ParseError } from "../src/errors/ParseError.js";
 


try {


  const pugFile = path.resolve("C:/Users/sam/Desktop/program-projects/srv/apps/string-portrait/code/src/views/string-portrait/view.pug");
  const {contract, errors} = parseContract(pugFile);
  console.log("✅ Parsed contract:");
  console.log(JSON.stringify(contract,  null, 2));
} catch (err) {
    if (err instanceof ParseError) {
    console.error("❌ Contract parse failed:", err.message);
  } else {
    console.error("❌ General error during parsing:", err);
  }
}
