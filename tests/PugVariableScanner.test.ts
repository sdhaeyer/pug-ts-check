import fs from "node:fs";
import path from "node:path";
import { scanPugVariables } from "../src/scanners/PugVariableScanner.js";

const pugPath = path.resolve("./tests/example-test-project/pug/sample.pug");
const pugSource = fs.readFileSync(pugPath, "utf8");

try {
  const result = scanPugVariables(pugSource);
  console.log("✅ Scanned variables:");
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error("❌ ERROR while scanning variables:", err);
}
