import { log } from "../utils/Logger.js";

/**
 * Scan TypeScript files for render() calls and their passed data
 */
export function scanRenderCalls(sourceFile: string) {
  log(`Scanning render() calls in ${sourceFile}...`);

  // TODO: use ts-morph to parse res.render calls

  return [];
}
