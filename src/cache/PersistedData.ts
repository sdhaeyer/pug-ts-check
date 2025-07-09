// src/cache/PersistedData.ts

import type { ParseResult } from "./parsedResult.js";

export interface PersistedData {
  parseResults: [string, ParseResult][];
  dependencyGraph: [string, string[]][];
}
