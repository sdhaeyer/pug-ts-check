import { ParseError } from "../errors/ParseError";

export interface MappedLine {
  lineNumber: number;
  file: string;
  debugInfo?: string; // optional debug info for better error messages
}


export class ParsedContract {
  pugPath: string; // path to the Pug file, for error reporting

  rawExpects: string | undefined; // for future use, if we want to track raw expects
  virtualExpects: Record<string, string>;
  atExpectLine: number; // line number where //@expect was found, for error reporting



  rawImports: Array<string>; // for future use, if we want to track raw imports

  rebasedImports: Array<string>;
  absoluteImports: Array<string>; // absolute paths for imports, used for type-checking


  rawIncludes: Array<string>; // raw includes from Pug, for error reporting
  includes: Array<string>; // absolute paths of included Pug files

  rawExtends: Array<string>; // raw extends from Pug, for error reporting
  extends: Array<string>; // absolute paths of extended Pug files

  importedTsFiles: Array<string>; // absolute paths of imported TypeScript files, for error reporting
  imports: Array<string>; // list of imported Pug files, for error reporting


  constructor(pugPath: string ) {
    this.pugPath = pugPath;


    this.rawExpects = undefined;
    this.virtualExpects = {};
    this.atExpectLine = -1;

    this.rawImports = [];
    this.rebasedImports = [];
    this.absoluteImports = [];
    
    this.rawIncludes = [];
    this.includes = [];

    this.rawExtends = [];
    this.extends = [];

    this.importedTsFiles = [];
    this.imports = [];
  }
}


export interface ParseOptions {
  projectPath?: string; // allow to override for tests
}