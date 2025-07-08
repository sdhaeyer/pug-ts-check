
import { Import } from "../utils/import.js";
import { Logger } from "../utils/Logger.js";


export interface MappedLine {
  lineNumber: number;
  file: string;
  debugInfo?: string; // optional debug info for better error messages
}

export class LineMap {
  public tsSource: string = "";

  public list: MappedLine[] = [];
  public indentLevel: number = 0;
  public indentString: string = "  "; // two spaces for indentation
  

  addLine(src: string, map: MappedLine = { lineNumber: 0, file: "file/path/not/given" }, oriSrc?: string) {
    const lines = src.split(/\r?\n/);
    for (const line of lines) {
      const currentIndex = this.list.length;
      // Logger.debug(`[${currentIndex}] Adding line: "${line}" - From: ${map.file}:${map.lineNumber} :oriSrc : "${oriSrc || ""}"`);
      const indentation = this.indentString.repeat(this.indentLevel);
      this.tsSource += indentation + line + "\n";

      this.list.push(map);
    }



  }

}

export class ParsedContract {
  pugPath: string; // path to the Pug file, for error reporting

  rawExpects: string; // for future use, if we want to track raw expects
  
  atExpectLine: number; // line number where //@expect was found, for error reporting

  imports: Array<Import>; // list of imports from Pug, for error reporting


  rawIncludes: Array<string>; // raw includes from Pug, for error reporting
  includes: Array<string>; // absolute paths of included Pug files

  rawExtends: Array<string>; // raw extends from Pug, for error reporting
  extends: Array<string>; // absolute paths of extended Pug files




  constructor(pugPath: string) {
    this.pugPath = pugPath;


    this.rawExpects = "";
    
    this.atExpectLine = -1;

    this.imports = [];

    this.rawIncludes = [];
    this.includes = [];

    this.rawExtends = [];
    this.extends = [];

  }

  static rehydrate(data: Partial<ParsedContract>): ParsedContract {
    const contract = new ParsedContract(data.pugPath || "");
    Object.assign(contract, data);

    contract.imports = contract.imports.map(
      imp => Import.fromImportString(imp.rawImportString, imp.file, imp.lineNumber)
    );
    return contract;
  }
}


export interface ParseOptions {
  projectPath?: string; // allow to override for tests
}