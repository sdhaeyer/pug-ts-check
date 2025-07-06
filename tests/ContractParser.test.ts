import fs from "node:fs";
import path from "node:path";
import { parseContract } from "../src/contracts/ContractParser.js";
import { ParseError } from "../src/errors/ParseError.js";
import { Logger } from "../src/utils/Logger.js";
import { logParseError } from "../src/logDiagnostics/logDiagnostics.js";
 


try {

  Logger.setLevel("debug");
  //const pugFile = path.resolve("C:/Users/sam/Desktop/program-projects/srv/apps/string-portrait/code/src/views/string-portrait/view.pug");
   const pugFile2 = path.resolve("C:/Users/sam/Desktop/program-projects/srv/apps/string-portrait/code/src/views/string-portrait/edit.pug");
  const {contract, errors} = parseContract(pugFile2);
  //const {contract: contract2, errors: errors2} = parseContract(pugFile2);

  Logger.info("✅ Parsed contract:");
  //Logger.info(JSON.stringify(contract,  null, 3));

  logParseError(errors, pugFile2);

  //Logger.info("✅ Parsed contract2:");
  //Logger.info(JSON.stringify(contract2,  null, 2));
  //Logger.info(`File 2 : ${pugFile2}`);
  //logParseError(errors2, pugFile2);
} catch (err) {
    if (err instanceof ParseError) {
    Logger.error("❌ Contract parse failed:", err.message);
  } else {
    Logger.error("❌ General error during parsing:", err);
  }
}
