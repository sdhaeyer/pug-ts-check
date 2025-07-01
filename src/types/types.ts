export interface MappedLine {
    line: number;
    file: string;
    debugInfo?: string; // optional debug info for better error messages
}


export interface ParsedContract {
    imports: Array<string>;
    expects: Record<string, string>;
    rawExpects: string; // for future use, if we want to track raw expects
}


export interface ParseOptions {
  projectPath?: string; // allow to override for tests
}