import fs from "node:fs";
import { config } from "./config.js";
import { Logger } from "../utils/Logger.js";

export interface PugTsConfig {
  tmpDir: string;
  projectPath: string;
  pugPaths: string[];
  logLevel: "info" | "debug" | "silent";
}

export function loadPugConfig(configPath: string): void {
  if (!fs.existsSync(configPath)) {
    Logger.warn(`⚠️  No pug.tsconfig.json found at ${configPath}, using built-in defaults.`);
    
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);

  try {

    // Set global config
    config.tmpDir = parsed.tmpDir;
    config.projectPath = parsed.projectPath;
    config.pugPaths = parsed.pugPaths;
    config.logLevel = parsed.logLevel;
  }
  catch (err) {
    Logger.error(`❌ Error parsing pug.tsconfig.json: ${err}`);
    throw new Error(`Failed to load Pug TypeScript config from ${configPath}`, { cause: err });
  }

}
