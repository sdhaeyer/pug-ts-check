import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

export interface PugTsConfig {
  tmpDir: string;
  projectPath: string;
  pugPaths: string[];
  logLevel: "info" | "debug" | "silent";
}

export function loadPugConfig(configPath: string): PugTsConfig | null {
  if (!fs.existsSync(configPath)) {
    console.warn(`⚠️  No pug.tsconfig.json found at ${configPath}, using built-in defaults.`);
    return null;
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);

  // apply defaults if you want:
  return {
    tmpDir: parsed.tmpDir ?? ".tmp",
    projectPath: parsed.projectPath ?? ".",
    pugPaths: parsed.pugPaths ?? ["./"],
    logLevel: parsed.logLevel ?? "info",
  };
}
export function setPugConfigFromUser(){
    const userConfig = loadPugConfig(
        path.resolve(process.cwd(), "pug.tsconfig.json")
    );

    if (userConfig) {
        // Set global config
        config.tmpDir = userConfig.tmpDir;
        config.projectPath = userConfig.projectPath;
        config.pugPaths = userConfig.pugPaths;
        config.logLevel = userConfig.logLevel;
    }
}
