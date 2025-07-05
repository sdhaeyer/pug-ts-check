#!/usr/bin/env node
import { Command } from "commander";
import chokidar from "chokidar";
import path from "node:path";
import fs from "node:fs";
import { Logger } from "../utils/Logger.js";
import { scanAll, scanFile } from "../scanner/scanfiles.js";


import { config } from "../config/config.js";
import { loadPugConfig } from "../config/loadPugConfig.js";
import { getTsProject } from "../validate/projectCache.js";
import { dependencyGraph } from "../cache/dependencyGraph.js";
import { logParseError, logSnippet } from "../logDiagnostics/logDiagnostics.js";
import { parsedResultStore } from "../cache/parsedResult.js";
import { lastScannedFile } from "../cache/lastScannedFile.js";


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
      Logger.init(`Using custom Pug TypeScript config at: ${pugTsConfigPath}`);
    }

   
    loadPugConfig(pugTsConfigPath)
    Logger.debug(config)
    
    parsedResultStore.load();
    

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
        Logger.init(`Running type-check for single file: ${resolved}`);
      }
    }
    
    
      if (options.watch) {
        const pugPaths = config.pugPaths.map((p) => path.resolve(config.projectPath, p));
        Logger.init(`Watching directories:\n - ${pugPaths.join("\n - ")}`);
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
          Logger.init("✅ Watcher Ready");
          Logger.init("Starting initial scan of Pug files...");

          // Initial scanproject.finishedData.ThreadLength
          scanAll(watcher);
          Logger.init("✅ Initial scan complete. Watching for changes...");
        });

        watcher.on("all", (event, file) => {
          file = path.resolve(file);
          // console.clear();
          console.log("***************************************************");
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
            
            const { errors} = scanFile(file);
                        
            logParseError(errors, file);
            dependencyGraph.getDependentsOf(file).forEach((pugPath) => {
              const {contract, errors} = scanFile(pugPath);
              logParseError(errors, pugPath);

              Logger.info(`Re-scanned ${pugPath}`);
            });
            // reScanAll(watcher);
          }
         
        });
        watcher.on("error", (err) => {
          Logger.error(`chokidar error: ${err}`);
        });
        // Add this after watcher.on("error", ...) — still inside options.watch block:
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        process.stdin.on("data", (key: string) => {
          if (key === "r") {
            console.log("manual rescan!");
            scanAll(watcher);
          }
          if (key === "s") {
            console.log("summary!");
            parsedResultStore.logSummary();
          }
          if (key === "e") {
            console.log("error log!");
            parsedResultStore.logErrors();
          }
          if (key === "f") {
            console.log("full log!");
            parsedResultStore.logFull();
          }
          if (key === "g") {
            console.log("generating ts from last file");
            if (lastScannedFile.path) {
              const { contract, errors, rawGeneratedTs } = scanFile(lastScannedFile.path);
              logSnippet(0, 500, rawGeneratedTs?.split(/\r?\n/) || []);
            } else {
              console.error("No last scanned file found.");
            }
            
          }
          if (key === "\u0003") {
            console.log("Exiting... & saving results");
            parsedResultStore.save();
            
            process.exit();
          }

        });
        process.on("SIGINT", () => {
          // Handle Ctrl+C
          
        });

      } else {
        scanAll(undefined);
      }
      
   
  });

program.parse();


