
import path from "node:path";
import { Project } from "ts-morph";
import { config } from "../config/config";
import { Logger } from "../utils/Logger";
import { resolveSharedLocals } from "../sharedLocals/sharedLocals";
import type { ProjectContext } from "../types/ProjectContext";

let _cachedContext: ProjectContext | null = null;

export function getProjectContext(): ProjectContext {
  if (_cachedContext){
     return _cachedContext;}
  else{
    Logger.warn("Project context is not initialized. Returning null.");
    throw new Error("Project context is not initialized. Call initProjectContext first.");
  }
}


export function initProjectContext(pugTsConfigPath: string): ProjectContext {
  if (_cachedContext) {
    Logger.warn("Project context is already initialized. Returning cached context.");
    return _cachedContext;
  } 


  const tsConfigFilePath = path.join(config.projectPath, "tsconfig.json");

  Logger.info("Creating new TypeScript project instance...");
  Logger.debug(`Using tsconfig at: ${tsConfigFilePath}`);

  const tsProject = new Project({ tsConfigFilePath });

  const tmpPath = path.resolve(process.cwd(), config.projectPath, config.tmpDir);
  const rootDir = path.resolve(tsProject.getCompilerOptions().rootDir ?? "");

  if (rootDir && !tmpPath.startsWith(rootDir)) {
    Logger.warn(`⚠️  Temporary file path is outside of configured rootDir:
    tmpPath: ${tmpPath}
    rootDir: ${rootDir}
    This will likely cause TS6059 errors. Please move your .tmp under rootDir.`);
  }

  _cachedContext = {    
    tsProject,
    pugTsConfigPath
  };


  if (config.sharedLocals) {
    
    _cachedContext.sharedLocalsMeta = resolveSharedLocals(tsProject);
  }

  Logger.info("Project context ready.");
  
  return _cachedContext;
}