import { Diagnostic } from "ts-morph";


type ParseErrorType = "precompile" | "typescriptValidateErrors" | "lint" | "typecheck";

export class ParseError extends Error {
  pugPath: string;
  pugLine: number;
  diagnostic?: Diagnostic; // Optional diagnostic for better error handling
  errorTypeCode?: number; // TypeScript error code for better identification

  type: ParseErrorType | undefined = undefined; // Default type, can be set to "typecheck" if needed

  constructor(message: string, pugPath?: string, pugLine?: number, diagnostic?: Diagnostic) {
    super(message);
    this.name = "ParseError";
    this.pugPath = pugPath ?? "no pug path provided";
    this.pugLine = pugLine ?? -1;
    this.diagnostic = diagnostic;
  }
}

