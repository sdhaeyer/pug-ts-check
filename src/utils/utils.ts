import path from "node:path";

export function printWithLineNumbers(source: string) {
  source.split("\n").forEach((line, idx) => {
    const lineNo = String(idx + 1).padStart(3, " ");
    console.log(`${lineNo}: ${line}`);
  });
}




export function rebaseImport(
  importLine: string,
  pugFilePath: string,
  tmpDir: string
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

  // now make a relative path from tmpDir to the target
  const relativeToTmp = path.relative(tmpDir, absoluteTarget).replace(/\\/g, "/");

  // substitute back
  return importLine.replace(originalPath, relativeToTmp);
}
