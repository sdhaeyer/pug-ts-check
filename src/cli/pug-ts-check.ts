#!/usr/bin/env node
import { Command } from "commander";
import chokidar from "chokidar";
import path from "node:path";
import fs from "node:fs";
import { Logger } from "../utils/Logger.js";
import { reScanAll, runTypeCheck } from "../runner/runTypeCheck.js";


import { config } from "../config/config.js";
import { loadPugConfig, setPugConfigFromUser } from "../config/loadPugConfig.js";
import { getTsProject } from "../validate/projectCache.js";

const program = new Command();

program
  .name("pug-ts-check")
  .description("Type-check Pug templates against TypeScript contracts")
  .version("0.1.0")
  .argument("<path>", "path to a .pug file or a directory")
  .option("--verbose", "enable verbose output")
  .option("--silent", "disable most logs")
  .option("--watch", "watch a directory for changes and re-run")
  .option("--projectPath <path>", "TypeScript project path")
  .option("--tmpDir <dir>", "temporary dir")
  .action((targetPath, options) => {
    if (options.silent) {
      Logger.setLevel("silent");
    } else if (options.verbose) {
      Logger.setLevel("debug");
    } else {
      Logger.setLevel("info");
    }
    
    setPugConfigFromUser();
    if (options.tmpDir) {
      config.tmpDir = options.tmpDir;
    }
    if (options.projectPath) {
      config.projectPath = options.projectPath;
    }

    if (options.pugPaths && options.pugPaths.length > 0) {
      config.pugPaths = options.pugPaths.map((p: string) => path.resolve(p));
    }

    var singleFile = false
    if (targetPath) {
      config.pugPaths = [path.resolve(targetPath)];
      const resolved = path.resolve(targetPath)

      if (!fs.existsSync(resolved)) {
        console.error(`File or directory not found: ${resolved}`);
        process.exit(1);
      }
      const stat = fs.statSync(resolved);
      if (stat.isFile()) {
        singleFile = true;
        Logger.info(`Running type-check for single file: ${resolved}`);
      }
    }
    
    
      if (options.watch) {
        Logger.info(`Watching directories:\n - ${config.pugPaths.join("\n - ")}`);
        const watcher = chokidar.watch(config.pugPaths, {
          ignored: (filePath, stats) => {
            if (!stats?.isFile()) return false;

            // only ignore files that are neither .pug nor .ts
            return !filePath.endsWith(".pug") && !filePath.endsWith(".ts");
          },
          ignoreInitial: true,
        });
        watcher.on("ready", () => {
          //console.clear();
          Logger.info("✅ Ready and watching for changes.");
          // Initial scan
          reScanAll(watcher);
        });

        watcher.on("all", (event, file) => {
          // console.clear();
          Logger.info(`-> Detected ${event} in ${file}, re-checking...`);
          // to only check if event is add or change
          if (event === "add" || event === "change") {
            if (file.endsWith(".ts")) {
              const refreshed = getTsProject().getSourceFile(file);
              if (refreshed) {
                refreshed.refreshFromFileSystemSync();
                Logger.debug(`Refreshed ${file} in ts-morph project`);
              }
            }
            reScanAll(watcher);
          }
         
        });
        watcher.on("error", (err) => {
          Logger.error(`chokidar error: ${err}`);
        });
        

      } else {
        reScanAll();
      }
      
   
  });

program.parse();


