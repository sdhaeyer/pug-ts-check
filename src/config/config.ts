
import { z } from "zod";

export const configSchema = z.object({
  pugTsConfigPath: z.string().default("./pug-ts.config.ts"),
  tmpDir: z.string().default(".tmp"),
  projectPath: z.string().default("./"),
  pugPaths: z.array(z.string()).default(["./src/views"]),
  logLevel: z.enum(["info", "debug", "warn", "error", "silent"]).default("info"),
  typesPath: z.string().default("./src/types"),
  viewsRoot: z.string().default("./src/views"),
  sharedLocals: z.object({
    importPath: z.string().default("./src/types/viewSharedLocals.d.ts"),
    typeName: z.string().default("SharedLocals")
  }).default({}),
  cacheParseResultsPath: z.string().default("./.tmp/pug.parseResults.json")
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({});
