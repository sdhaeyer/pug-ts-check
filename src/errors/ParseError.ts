export class ParseError extends Error {
  pugPath: string;
  pugLine: number;

  constructor(message: string, pugPath: string, pugLine: number) {
    super(message);
    this.name = "ParseError";
    this.pugPath = pugPath;
    this.pugLine = pugLine;
  }
}

