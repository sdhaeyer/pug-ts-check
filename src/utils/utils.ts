import path from "node:path";
import {config} from "../config/config.js";
import { Logger } from "./Logger.js";

export function printWithLineNumbers(source: string) {
  source.split("\n").forEach((line, idx) => {
    const lineNo = String(idx + 1).padStart(3, " ");
    console.log(`${lineNo}: ${line}`);
  });
}




export function rebaseImport(
  importLine: string,
  pugFilePath: string,
  
): string {
  
  // Match only from "...", with quotes
  const match = importLine.match(/from\s+["']([^"']+)["']/);
  if (!match) {
    return importLine; // leave untouched if cannot parse
  }

  const originalPath = match[1];

  // resolve where it *actually* lives
  const pugDir = path.dirname(pugFilePath);
  const absoluteTarget = path.resolve(pugDir, originalPath);
  const absoluteTmp = path.resolve(config.projectPath, config.tmpDir);

  // now make a relative path from tmpDir to the target
  const relativeToTmp = path.relative(absoluteTmp, absoluteTarget).replace(/\\/g, "/");

  Logger.debug("Rebasing import:")
  Logger.debug("originalPath   :", originalPath)
  Logger.debug("absoluteTarget :", absoluteTarget)
  Logger.debug("tmpDir         :", config.tmpDir)
  Logger.debug("relativeToTmp  :", relativeToTmp)
  Logger.debug("pugFilePath    :", pugFilePath)
  

  

  const toReturn  = importLine.replace(originalPath, relativeToTmp);
  Logger.debug(`Rebased import line: ${toReturn}`);
  // substitute back
  return toReturn
}




export function absoluteImport(
  importLine: string,
  pugFilePath: string,
  
): string {
  
  // Match only from "...", with quotes
  const match = importLine.match(/from\s+["']([^"']+)["']/);
  if (!match) {
    return importLine; // leave untouched if cannot parse
  }

  const originalPath = match[1];

  // resolve where it *actually* lives
  const pugDir = path.dirname(pugFilePath).replace(/\\/g, "/");;
  const absoluteTarget = path.resolve(pugDir, originalPath).replace(/\\/g, "/");;
  const absoluteTmp = path.resolve(config.projectPath, config.tmpDir).replace(/\\/g, "/");;

  // now make a relative path from tmpDir to the target
  const relativeToTmp = path.relative(absoluteTmp, absoluteTarget).replace(/\\/g, "/");

  Logger.debug("Rebasing import:")
  Logger.debug("originalPath   :", originalPath)
  Logger.debug("absoluteTarget :", absoluteTarget)
  Logger.debug("tmpDir         :", config.tmpDir)
  Logger.debug("relativeToTmp  :", relativeToTmp)
  Logger.debug("pugFilePath    :", pugFilePath)
  

  

  const toReturn  = importLine.replace(originalPath, absoluteTarget);
  Logger.debug(`Rebased import line: ${toReturn}`);
  // substitute back
  return toReturn
}
