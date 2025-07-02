#!/usr/bin/env node
import { Command } from "commander";
import chokidar from "chokidar";
import path from "node:path";
import fs from "node:fs";
import { Logger } from "../utils/Logger.js";
import { runTypeCheck } from "../runner/runTypeCheck.js";


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
        const watcher = chokidar.watch(resolved, {
          ignored: (filePath, stats) => stats?.isFile() ? !filePath.endsWith(".pug") : false
        });

        watcher.on("ready", () => {
          Logger.info("✅ chokidar is ready and watching for changes.");
        });
        
        watcher.on("all", (event, file) => {

          Logger.info(`-> Detected ${event} in ${file}, re-checking...`);
          // to only check if event is add or change
          if (event === "add" || event === "change") {
            runTypeCheck(file, projectPath);
          }
        });
        watcher.on("error", (err) => {
          Logger.error(`chokidar error: ${err}`);
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

