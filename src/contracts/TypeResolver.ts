import { Project } from "ts-morph";
import { log } from "../utils/Logger.js";

/**
 * Initialize ts-morph and resolve types
 */
export function resolveTypes() {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json"
  });
  log("Loaded ts-morph project for type resolution");

  // TODO: later actually resolve types here
  return project;
}
