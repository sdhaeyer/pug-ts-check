import fs from "node:fs";
import { config, configSchema } from "./config.js";
import { Logger } from "../utils/Logger.js";
import { get } from "node:http";
import { Path } from "../utils/utils.js";
import { askYesNo } from "../utils/askYesNo.js";


export interface PugTsConfig {
  tmpDir: string;
  projectPath: string;
  pugPaths: string[];
  logLevel: "info" | "debug" | "silent";
}




export async function loadPugTsConfigPath(configPath: string): Promise<void> {
  

  // loading ... 
  if (!fs.existsSync(configPath)) {
    Logger.warn(`⚠️ No pug.tsconfig.json found at ${configPath}, using built-in defaults.`);
    return
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);

  
  // Validate and assign
  try   {
    const validated = configSchema.parse(parsed);
    // Set it directly
    Object.assign(config, validated);
  
    configSchema.strip().parse(parsed);
  }catch (error) {
    throw new Error(`Unable to parse your config file: \n ${configPath}:\n ${error}`, error instanceof Error ? { cause: error } : undefined);
  }

  // making the directory if it does not exist after asking
  const typesDir = Path.dirname(Path.resolve(config.projectPath, config.typesPath));
  if (!fs.existsSync(typesDir)) {
    const shouldCreate = await askYesNo(`❓ Output directory does not exist:\n ${typesDir}\n Create it?`);
    if (!shouldCreate) {
      throw new Error(`Aborted: output directory was missing.`);
    }
    fs.mkdirSync(typesDir, { recursive: true });
    Logger.info(`📁 Created directory: ${typesDir}`);
  }

  // we need to catch that viewsRoot is a parent directory of all the pug paths( for starters might expend to multiple pug roots later)
  const viewsRoot = Path.resolve(config.projectPath, config.viewsRoot);
  config.pugPaths.forEach((pugPath) => {
    const resolved = Path.resolve(config.projectPath, pugPath);
    if (!isSubpath(viewsRoot, resolved)) {
      throw new Error(`Pug path ${pugPath} is not under viewsRoot ${config.viewsRoot}\n Please adjust the config file:\n ${configPath}\n to ensure that all pug paths are under the viewsRoot: ${viewsRoot}`);
    }
  });
}


function isSubpath(parent: string, child: string): boolean {
  const relative = Path.relative(parent, child);
  return !!relative && !relative.startsWith("..") && !Path.isAbsolute(relative);
}