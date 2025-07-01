#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { parseContractComments } from "../contracts/ContractParser.js";
import { precompilePug } from "../precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../tsgen/pugTsGenerator.js";
import { validateGeneratedTs } from "../validate/validateGeneratedTs.js";
import { Logger } from "../utils/Logger.js";
import { printWithLineNumbers } from "../utils/utils.js";

import chokidar from "chokidar";


const program = new Command();

program
  .name("pug-ts-check")
  .description("Type-check Pug templates against TypeScript contracts")
  .version("0.1.0")
  .argument("<pugfile>", "path to the .pug file to check")
  .option("--verbose", "enable verbose output")
  .option("--silent", "disable most logs")
  .option("--watch", "watch a directory for changes and re-run")
  .action((pugfile, options) => {
    if (options.silent) {
      process.env.LOG_LEVEL = "";
    } else if (options.verbose) {
      process.env.LOG_LEVEL = "debug";
    } else {
      process.env.LOG_LEVEL = "info";
    }

    const pugPath = path.resolve(pugfile);
    const projectPath = "./tests/example-test-project";

    if (!fs.existsSync(pugPath)) {
      console.error(`File not found: ${pugPath}`);
      process.exit(1);
    }

    const pugSource = fs.readFileSync(pugPath, "utf8");

    try {
      // call with pugPath and pugSource
      const contract = parseContractComments(pugPath, { projectPath }, pugSource);

      const ast = precompilePug(pugPath, pugSource);

      const tsResult = generateTsFromPugAst(ast, contract);

      Logger.info("✅ Generated TypeScript:");
      printWithLineNumbers(tsResult.tsSource);

      Logger.info("✅ Line Map:");
      tsResult.lineMap.forEach((entry, i) => {
        Logger.info(`line ${i + 1} -> Line ${entry.line} in file ${entry.file}`);
      });

      Logger.info("✅ Starting type-check validation...");

      validateGeneratedTs( tsResult.tsSource, tsResult.lineMap, { projectPath } );

      Logger.info("✅ pug-ts-check completed successfully!");

    } catch (err) {
      console.error(`❌ pug-ts-check failed:\n${err}`);
      process.exit(1);
    }
  });

program.parse();
