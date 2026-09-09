
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { Project } from "ts-morph";
import type { Config } from "../config/config.js";
import { Logger } from "../utils/Logger.js";
import { resolveSharedLocals } from "../sharedLocals/sharedLocals.js";
import type { ProjectContext } from "../types/ProjectContext.js";

let _cachedContext: ProjectContext | null = null;

export function getProjectContext(): ProjectContext {
  if (_cachedContext){
     return _cachedContext;}
  else{
    Logger.warn("Project context is not initialized. Returning null.");
    throw new Error("Project context is not initialized. Call initProjectContext first.");
  }
}


export function initProjectContext(config:Config): ProjectContext {
  if (_cachedContext) {
    Logger.warn("Project context is already initialized. Returning cached context.");
    return _cachedContext;
  } 

  const tsConfigFilePath = path.join(config.projectPath, "tsconfig.json");

  Logger.init("Creating new TypeScript project instance...");
  Logger.debug(`Using tsconfig at: ${tsConfigFilePath}`);

  const tsProject = new Project({ tsConfigFilePath });

  const rootDir = path.resolve(config.projectPath, tsProject.getCompilerOptions().rootDir ?? ".");
  const virtualTmpDir = getUnusedVirtualSourceRoot(rootDir);

  const sharedLocalsMeta = resolveSharedLocals(config);

  _cachedContext = {    
    tsProject,
    virtualTmpDir,
    
    sharedLocalsMeta 
  };



  Logger.init("Project context ready.");
  
  return _cachedContext;
}

function getUnusedVirtualSourceRoot(rootDir: string): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = path.join(rootDir, `.pug-ts-check-${randomUUID()}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to create a unique virtual source root under ${rootDir}`);
}