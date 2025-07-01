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
import { glob } from "glob";

import { printWithLineNumbers } from "../utils/utils.js";
import { ContractParseError } from "../errors/ContractParseError.js";

const program = new Command();

program
  .name("pug-ts-check")
  .description("Type-check Pug templates against TypeScript contracts")
  .version("0.1.0")
  .argument("<path>", "path to a .pug file or a directory")
  .option("--verbose", "enable verbose output")
  .option("--silent", "disable most logs")
  .option("--watch", "watch a directory for changes and re-run")
  .option("--projectPath <path>", "override project path (default: current working directory)")
  .action((targetPath, options) => {
    if (options.silent) {
      process.env.LOG_LEVEL = "";
    } else if (options.verbose) {
      process.env.LOG_LEVEL = "debug";
    } else {
      process.env.LOG_LEVEL = "info";
    }

    const resolved = path.resolve(targetPath);
    const projectPath = options.projectPath || process.cwd();

    if (!fs.existsSync(resolved)) {
      console.error(`File or directory not found: ${resolved}`);
      process.exit(1);
    }

    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
      if (options.watch) {
        Logger.info(`Watching directory ${resolved} for .pug changes...`);

        const watcher = chokidar.watch("**/*.pug", {
          
          ignoreInitial: false,
        });
        watcher.on("ready", () => {
          Logger.info("✅ chokidar is ready and watching for changes.");
        });
        watcher.on("all", (event, file) => {
          const fullPath = path.join(resolved, file);
          Logger.info(`Detected ${event} in ${file}, re-checking...`);
          //runTypeCheck(fullPath, projectPath);
        });
        watcher.on("error", (err) => {
          Logger.error(`chokidar error: ${err}`);
        });
        // manually run once using glob
        const files = glob.sync("**/*.pug", { cwd: resolved });
        for (const file of files) {
            const fullPath = path.join(resolved, file);
            runTypeCheck(fullPath, projectPath);
        }

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
    const contract = parseContractComments(pugPath, pugSource,  { projectPath });

    const ast = precompilePug(pugPath, pugSource);
    const tsResult = generateTsFromPugAst(ast, contract);

    Logger.info(`✅ Generated TypeScript for ${path.basename(pugPath)}:`);
    // printWithLineNumbers(tsResult.tsSource);

    // Logger.info("✅ Starting type-check validation...");

    let diags = validateGeneratedTs( tsResult.tsSource, tsResult.lineMap, { projectPath } );
    if (diags.length > 0) {
        Logger.error(`❌ ${path.basename(pugPath)} failed type-check!`);
    }else{
        Logger.info(`✅ ${path.basename(pugPath)} passed type-check!`);
    }
  } catch (err) {

      if (err instanceof ContractParseError) {
          console.error(`❌ Contract parse failed ${pugPath} - projectpath ${projectPath}: `, err.message);
      } else {
          console.error("❌ General error during parsing:", err);
      }
  }
}
