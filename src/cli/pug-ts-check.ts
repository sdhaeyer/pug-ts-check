#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import chokidar from "chokidar";
import { parseContractComments } from "../contracts/ContractParser.js";
import { precompilePug } from "../precompile/PugPrecompiler.js";
import { generateTsFromPugAst } from "../tsgen/pugTsGenerator.js";
import { validateGeneratedTs } from "../validate/validateGeneratedTs.js";
import { Logger } from "../utils/Logger.js";
import { printWithLineNumbers } from "../utils/utils.js";

const program = new Command();

program
  .name("pug-ts-check")
  .description("Type-check Pug templates against TypeScript contracts")
  .version("0.1.0")
  .argument("<path>", "path to a .pug file or a directory")
  .option("--verbose", "enable verbose output")
  .option("--silent", "disable most logs")
  .option("--watch", "watch a directory for changes and re-run")
  .action((targetPath, options) => {
    if (options.silent) {
      process.env.LOG_LEVEL = "";
    } else if (options.verbose) {
      process.env.LOG_LEVEL = "debug";
    } else {
      process.env.LOG_LEVEL = "info";
    }

    const resolved = path.resolve(targetPath);
    const projectPath = process.cwd();

    if (!fs.existsSync(resolved)) {
      console.error(`File or directory not found: ${resolved}`);
      process.exit(1);
    }

    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
      if (options.watch) {
        Logger.info(`Watching directory ${resolved} for .pug changes...`);

        const watcher = chokidar.watch("**/*.pug", {
          cwd: resolved,
          ignoreInitial: false,
        });

        watcher.on("all", (event, file) => {
          const fullPath = path.join(resolved, file);
          Logger.info(`Detected ${event} in ${file}, re-checking...`);
          runTypeCheck(fullPath, projectPath);
        });

      } else {
        const files = fs
          .readdirSync(resolved)
          .filter((f) => f.endsWith(".pug"));

        if (files.length === 0) {
          console.log(`No .pug files found in directory ${resolved}`);
          return;
        }

        for (const file of files) {
          runTypeCheck(path.join(resolved, file), projectPath);
        }
      }

    } else {
      runTypeCheck(resolved, projectPath);
    }
  });

program.parse();

function runTypeCheck(pugPath: string, projectPath: string) {
  try {
    const pugSource = fs.readFileSync(pugPath, "utf8");
    const contract = parseContractComments(pugPath, { projectPath }, pugSource);

    const ast = precompilePug(pugPath, pugSource);
    const tsResult = generateTsFromPugAst(ast, contract);

    Logger.info(`✅ Generated TypeScript for ${path.basename(pugPath)}:`);
    // printWithLineNumbers(tsResult.tsSource);

    Logger.info("✅ Starting type-check validation...");

    validateGeneratedTs(
      tsResult.tsSource,
      tsResult.lineMap,
      { projectPath }
    );

    Logger.info(`✅ ${path.basename(pugPath)} passed type-check!`);
  } catch (err) {
    console.error(`❌ pug-ts-check failed for ${pugPath}:\n${err}`);
  }
}
