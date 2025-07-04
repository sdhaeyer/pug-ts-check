import { ParseError } from "../errors/ParseError";

export interface MappedLine {
    lineNumber: number;
    file: string;
    debugInfo?: string; // optional debug info for better error messages
}


export interface ParsedContract {
    rawImports: Array<string>; // for future use, if we want to track raw imports
    rawExpects: string |undefined; // for future use, if we want to track raw expects

    rebasedImports: Array<string>;
    absoluteImports: Array<string>; // absolute paths for imports, used for type-checking
    virtualExpects: Record<string, string>;

    atExpectLine: number; // line number where //@expect was found, for error reporting
    pugPath: string; // path to the Pug file, for error reporting
}


export interface ParseOptions {
  projectPath?: string; // allow to override for tests
}