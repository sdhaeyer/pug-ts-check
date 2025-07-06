
import { ParseError } from "../errors/ParseError.js";
import { config } from "../config/config.js";
import { Path } from "./utils.js";

export class Import {
  importClause: string;  // e.g. import { Cart }
  modulePath: string;    // e.g. ./contracts/cart
  lineNumber: number;
  file: string;

  constructor(importString: string, file: string,lineNumber: number ) {
    const match = importString.match(/^(import\s+.*)\s+from\s+['"]([^'"]+)['"]/);
    if (!match) {
      throw new ParseError(`Invalid import line: ${importString}`, file, lineNumber);
    }
    this.importClause = match[1].trim();
    this.modulePath = match[2].trim();
    this.lineNumber = lineNumber;
    this.file = file;
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
    return `${this.importClause} from "${absPath}"`;
  }

  /**
   * Returns an import statement relative to the tmp directory
   */
  getRebasedImportStatement(): string {
    const absPath = this.getAbsolutePath();
    const tmpDir = Path.resolve(config.projectPath, config.tmpDir);
    const relativeToTmp = Path.relative(tmpDir, absPath);
    return `${this.importClause} from "${relativeToTmp}"`;
  }

    static fromImportString(importString: string, file: string, lineNumber: number): Import {
        return new Import(importString, file, lineNumber);
    }
}
