#!/usr/bin/env node
import { Command } from "commander";
import chokidar from "chokidar";
import path from "node:path";
import fs from "node:fs";
import { Logger } from "../utils/Logger.js";
import { reScanAll, runTypeCheck } from "../runner/runTypeCheck.js";


import { config } from "../config/config.js";
import { loadPugConfig } from "../config/loadPugConfig.js";
import { getTsProject } from "../validate/projectCache.js";

const program = new Command();

program
  .name("pug-ts-check")
  .description("Type-check Pug templates against TypeScript contracts")
  .version("0.1.0")
  .argument("[path]", "path to a .pug file or a directory")
  .option("--verbose", "enable verbose output")
  .option("--silent", "disable most logs")
  .option("--watch", "watch a directory for changes and re-run")
  .option("--projectPath <path>", "TypeScript project path")
  .option("--tmpDir <dir>", "temporary dir")
  .option("--pugTsConfig <pug.tsconfig.json>", "path to Pug TypeScript config file")
  .action((targetPath, options) => {
    if (options.silent) {
      Logger.setLevel("silent");
    } else if (options.verbose) {
      Logger.setLevel("debug");
    } else {
      Logger.setLevel("info");
    }

    Logger.debug("Showing debug lines ");
    const pugTsConfigPath =options.pugTsConfig  || "pug.tsconfig.json";
    if(options.pugTsConfig ){
      Logger.info(`Using custom Pug TypeScript config at: ${pugTsConfigPath}`);
    }

   
    loadPugConfig(pugTsConfigPath)
    Logger.debug(config)
     
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
        const pugPaths = config.pugPaths.map((p) => path.resolve(config.projectPath, p));
        Logger.info(`Watching directories:\n - ${pugPaths.join("\n - ")}`);
        const watcher = chokidar.watch(pugPaths, {
          ignored: (filePath, stats) => {
            if (!stats?.isFile()) return false;

            // only ignore files that are neither .pug nor .ts
            return !filePath.endsWith(".pug") && !filePath.endsWith(".ts");
          },
          ignoreInitial: true,
        });
        watcher.on("ready", () => {
          //console.clear();
          Logger.info("✅ Watcher Ready");
          Logger.info("Starting initial scan of Pug files...");

          // Initial scanproject.finishedData.ThreadLength
          reScanAll(watcher);
          Logger.info("✅ Initial scan complete. Watching for changes...");
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


