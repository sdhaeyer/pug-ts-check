
import { ParseError } from "../errors/ParseError.js";
import { config } from "../config/config.js";
import { Path, splitTopLevel } from "./utils.js";

export class Import {
  rawImportString: string; // e.g. "import { Cart, Product } from './contracts/cart'"
  importSymbols: string[] = []; // e.g. ['Cart', 'Product']

  modulePath: string;    // e.g. ./contracts/cart
  lineNumber: number;
  file: string;

  constructor(importString: string, file: string, lineNumber: number) {
    this.rawImportString = importString;

    const match = importString.match(/^(import\s+.*)\s+from\s+['"]([^'"]+)['"]/);
    if (!match) {
      throw new ParseError(`Invalid import line: ${importString}`, file, lineNumber);
    }
    const importClause = match[1].trim();

    this.modulePath = this.quickNormalizePath(match[2].trim());


    this.lineNumber = lineNumber;
    this.file = file;
    this.importSymbols = this.extractSymbols(importClause);

  }
  private quickNormalizePath(importPath: string): string {
    if (!importPath) return "";

    // remove extension if present
    const withoutExt = importPath.replace(/\.(js|ts|d\.ts)$/, "");
    const withExtension = withoutExt + ".js";

    return Path.normalize(withExtension);
  }


  /**
   * Returns absolute resolved file path
   */
  getAbsolutePath(): string {
    const baseDir = Path.dirname(this.file);
    return Path.resolve(baseDir, this.modulePath);
  }

  /**
   * Returns an absolute import statement with rebased absolute path
   */
  getAbsoluteImportStatement(): string {
    const absPath = this.getAbsolutePath();
    return `${this.getImportClause()} from "${absPath}"`;
  }

  /**
   * Returns an import statement relative to the tmp directory
   */
  getRebasedImportStatementTemp(): string {

    const tmpDir = Path.resolve(config.projectPath, config.tmpDir);
    return this.getRebasedImportStatement(tmpDir);

  }

  /**
  * Returns an import statement relative to the tmp directory
  */
  getRebasedImportStatement(folder: string): string {
    return `${this.getImportClause()} from "${this.getRebasedPath(folder)}"`;
  }



  getRebasedPath(folder: string): string {
    const absPath = this.getAbsolutePath();
    return Path.relative(folder, absPath);
  }

  getImportClause(withType: boolean = true): string {
    const typePrefix = withType ? "type " : "";
    return `import ${typePrefix} { ${this.importSymbols.join(", ")} }`;
  }
  private extractSymbols(importClause: string): string[] {
    const match = importClause.match(/import\s+(?:type\s*)?{([^}]+)}/);
    if (!match) return [];
    const ar = splitTopLevel(match[1].trim(), ',');
        
    return ar.map((s) => s.trim()).filter(Boolean);
  }

  // todo this prob better becomes a restore from partials ... i think this is only used for getting the import back out off the json saved import and this is then also why we still have to keep the rawImportString available... nut i'm a bit new to json loading 
  static fromImportString(importString: string, file: string, lineNumber: number): Import {
    return new Import(importString, file, lineNumber);
  }
}
