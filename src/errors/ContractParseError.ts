export class ContractParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractParseError";
  }
}

