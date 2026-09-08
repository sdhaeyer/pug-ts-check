#!/usr/bin/env node
import { Command } from "commander";
import chokidar from "chokidar";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Logger } from "../utils/Logger.js";
import { scanNewAndChanged, scanFile } from "../scanner/scanfiles.js";


import { Config, configSchema } from "../config/config.js";
import { loadPugTsConfigPath } from "../config/loadPugConfig.js";
import { dependencyGraph } from "../cache/dependencyGraph.js";
import { logParseError, logSnippet } from "../logDiagnostics/logDiagnostics.js";

import { lastScannedFile } from "../cache/lastScannedFile.js";
import { generateViewLocals } from "../tsgen/generateViewLocals.js";
import {  initProjectContext } from "../cache/project-context.js";
import { Path } from "../utils/utils.js";
import { ParsedResultStore } from "../cache/parsedResult.js";

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

program
  .name("pug-ts-check")
  .description("Type-check Pug templates against TypeScript contracts")
  .version(packageJson.version)
  .argument("[path]", "path to a .pug file or a directory")
  .option("--verbose", "enable verbose output")
  .option("--silent", "disable most logs")
  .option("--check-only", "type-check without writing viewlocals.d.ts")
  .option("--report", "show cached errors without rescanning Pug files, handy when running watch mode but still needing the error list.")
  .option("--rescan-all", "ignore the cache and rescan every Pug file")
  .option("--watch", "watch a directory for changes and re-run")
  .option("--projectPath <path>", "TypeScript project path")
  .option("--tmpDir <dir>", "temporary dir")
  .option("--config <pug.tsconfig.json>", "path to Pug TypeScript config file")
  .action(async (targetPath, options) => {
    
    Logger.init("Pug Typescript Checker version " + packageJson.version);

    if (options.silent) {
      Logger.setLevel("silent");
    } else if (options.verbose) {
      Logger.setLevel("debug");
    } else {
      Logger.setLevel("info");
    }

    Logger.debug("Showing debug lines ");
    const pugTsConfigPath = options.config || "pug.tsconfig.json";

    
    
    if (options.config) {
      Logger.init(`Using custom Pug TypeScript config at: ${pugTsConfigPath}`);
      
    }

    const config =  await loadPugTsConfigPath(pugTsConfigPath) || configSchema.parse({});
    Logger.debug(config)


    // overwrite the config with the options

    if (options.tmpDir) {
      config.tmpDir = options.tmpDir;
    }
    if (options.projectPath) {
      config.projectPath = options.projectPath;
    }
    if (options.pugPaths && options.pugPaths.length > 0) {
      config.pugPaths = options.pugPaths.map((p: string) => path.resolve(p));
    }

    quickValidateConfig(config, pugTsConfigPath);

    if (options.report) {
      const parsedResultStore = new ParsedResultStore(config);
      parsedResultStore.load();
      parsedResultStore.logErrors(true);
      if (parsedResultStore.hasErrors()) {
        process.exitCode = 1;
      }
      return;
    }
    
    // Make the project after using the config 
    const ctx = initProjectContext(config);
    Logger.init("Loading Pug ParsedResults from disk...");
    const parsedResultStore = new ParsedResultStore(config);
    parsedResultStore.load();
    if (options.rescanAll) {
      parsedResultStore.markAllStale();
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
      Logger.init("Watching directories:");
      pugPaths.forEach((p) => {
        const relativePath = path.relative(config.projectPath, p);
        Logger.init(`- ${relativePath}`);
      });
      const watcher = chokidar.watch(pugPaths, {
        ignored: (filePath, stats) => {
          if (!stats?.isFile()) return false;

          // only ignore files that are neither .pug nor .ts
          return !filePath.endsWith(".pug") && !filePath.endsWith(".ts");
        },
        ignoreInitial: true,
      });
      if (config.sharedLocals?.importPath) {
        const abs = path.resolve(path.dirname(config.projectPath), config.sharedLocals.importPath) + ".ts";
        watcher.add(abs);
      }
      watcher.on("ready", () => {
        //console.clear();
        Logger.init("✅ Watcher Ready");
        Logger.init("Starting scan changed files...");

        // Initial scanproject.finishedData.ThreadLength
        scanNewAndChanged(config, parsedResultStore, watcher);
        
        parsedResultStore.logSummary();
        parsedResultStore.save();

        Logger.init("✅ Initial scan complete. Watching for changes...");
        logCommands();
      });

      watcher.on("all", (event, file) => {
        file = path.resolve(file);
        const relativePath = path.relative(config.projectPath, file);
        console.log("\n".repeat(20));
        logCommands();
        console.log("*EVENT DETECTED**************************************************");
        Logger.info(`-> Detected ${event} in ${relativePath}, re-checking...`);

        if (event === "add" || event === "change") {
          
          let scanDepGraph = false;
          if (file.endsWith(".ts")) {
            const refreshed = ctx.tsProject.getSourceFile(file);
            if (refreshed) {
              refreshed.refreshFromFileSystemSync();
              Logger.info(`Refreshed ${relativePath} in ts-morph project`);
              dependencyGraph.getDependentsOf(file).forEach((pugPath) => {
                parsedResultStore.setStale(pugPath, true);
                parsedResultStore.markStaleDependents();

              });
            }
          } else {
            const { errors, contract } = scanFile(file, config, parsedResultStore, watcher);
            logParseError(errors, file, config );
            parsedResultStore.setStale(file, true);
            parsedResultStore.markStaleDependents();
            parsedResultStore.setStale(file, false);

          }
          if (parsedResultStore.hasStale()) {
            Logger.info(`🔍 Scanning dependency graph`);
            scanNewAndChanged(config, parsedResultStore, watcher);
          } else {
            Logger.info(`Skipping dependency graph`);
            if (!parsedResultStore.hasErrors()) generateViewLocals(config, parsedResultStore);
          }
          if (!parsedResultStore.hasErrors()) {
            Logger.info(`✅ All changes processed successfully.`);
          } else {
            Logger.error("❌ Still errors in the project");
            Logger.error("Aantal fouten: " + parsedResultStore.countErrors() + " in " + parsedResultStore.countErrorFiles() + " files");
            //parsedResultStore.logFull();

          }
          parsedResultStore.save();


          // scanNewAndChanged(watcher);
        }
        logCommands();

      });
      watcher.on("error", (err) => {
        Logger.error(`chokidar error: ${err}`);
        logCommands();
      });
      // Add this after watcher.on("error", ...) — still inside options.watch block:
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (key: string) => {
        if (key === "r") {
          Logger.info("manual rescan of changed files!");
          scanNewAndChanged(config, parsedResultStore, watcher);
          parsedResultStore.logSummary();
          parsedResultStore.save();
        }
        if (key === "a") {
          Logger.info("manual full rescan!");
          parsedResultStore.markAllStale();
          scanNewAndChanged(config, parsedResultStore, watcher);
          parsedResultStore.logSummary();
          parsedResultStore.save();
        }
        if (key === "s") {
          Logger.info("summary!");
          parsedResultStore.logSummary();
        }
        if (key === "e") {
          parsedResultStore.logErrors();
        }
        if (key === "f") {
          Logger.info("full log!");
          parsedResultStore.logFull();
        }
        if (key === "g") {
          Logger.info("generating ts from last file");
          if (lastScannedFile.path) {
            const { contract, errors, rawGeneratedTs } = scanFile(lastScannedFile.path,config, parsedResultStore, watcher);
            logSnippet(0, 500, rawGeneratedTs?.split(/\r?\n/) || []);
          } else {
            Logger.error("No last scanned file found.");
          }

        }
        if (key === "l") {
          const outDir = Path.resolve(config.projectPath, config.typesPath);
          const outputPath = Path.resolve(outDir, "viewlocals.d.ts");
          Logger.info(`${outputPath}`);
        }
        if (key === "\u0003") {
          Logger.info("Exiting... & saving results");
          parsedResultStore.save();

          process.exit();
        }
        logCommands();
      });
      process.on("SIGINT", () => {
        // Handle Ctrl+C

      });

    } else {
      scanNewAndChanged(config, parsedResultStore, undefined, !options.checkOnly);
      parsedResultStore.logErrors(true);
      parsedResultStore.save();
      if (parsedResultStore.hasErrors()) {
        process.exitCode = 1;
      }

    }


  });

await program.parseAsync()


function logCommands() {
  console.log("\n📋 Interactive Commands: r=rescan changed | a=rescan all | s=summary | e=errors | f=full log | g=generate TS | l=Show Locals | Ctrl+C=exit\n");
}
function quickValidateConfig(config: Config, configPath:string) {
  
  const message = `❌ Invalid configuration at ${configPath}:\n`; 
  if (!config.projectPath) {
    throw new Error(message + "Project path is not set in the configuration.");
  } else {
    if (!fs.existsSync(config.projectPath)) {
      throw new Error(message + `Project path does not exist: ${config.projectPath}`);
    }
  }

  if (!config.pugPaths || config.pugPaths.length === 0) {
    throw new Error(message + "Pug paths are not set in the configuration.");

  } else {
    for (const pugPath of config.pugPaths) {
      const abs = Path.resolve(config.projectPath, pugPath);
      if (!fs.existsSync(abs)) {
        throw new Error(message + `Scan folder ${pugPath} does not exist, adjust your config file. `);
      }
    }
    if (!config.viewsRoot) {
      throw new Error(message + "Views root is not set in the configuration.");
    } else {
      const abs = Path.resolve(config.projectPath, config.viewsRoot);
      if (!fs.existsSync(abs)) {
        throw new Error(message + `Views root does not exist: ${abs}`);
      }
    }
    if (!config.typesPath) {
      throw new Error(message + "Types path is not set in the configuration.");
    } else {
      const abs = Path.resolve(config.projectPath, config.typesPath);
      if (!fs.existsSync(abs)) {
        throw new Error(message + `Types path does not exist: ${abs}`);
      }
    }
    if (!config.sharedLocals) {
      // optional is ok
    } else {
      if (!config.sharedLocals.importPath) {
        throw new Error(message + "Shared locals import path is not set in the configuration.");
      } else {
        const abs = Path.resolve(config.projectPath, config.sharedLocals.importPath);
        if (!fs.existsSync(abs)) {
          // Auto-create empty file if missing
          fs.mkdirSync(Path.dirname(abs), { recursive: true });
          fs.writeFileSync(abs, 'export type SharedLocals = {}\n', 'utf8');
          Logger.info(`Auto-created stub SharedLocals type at: ${abs}`);
        }
      }
    }

  }
}