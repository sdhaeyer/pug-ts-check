
import { z } from "zod";

export const configSchema = z.object({
  tmpDir: z.string().default(".tmp"),
  projectPath: z.string().default("."),
  pugPaths: z.array(z.string()).default(["./src/views"]),
  logLevel: z.enum(["info", "debug", "warn", "error", "silent"]).optional().default("info"),
  typesPath: z.string().default("./src/types"),
  viewsRoot: z.string().default("./src/views"),
  sharedLocals: z.object({
    importPath: z.string().default("./src/types/viewSharedLocals.d.ts"),
    typeName: z.string().optional().default("SharedLocals")
  }).optional()
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = {
  tmpDir: ".tmp",
  projectPath: ".",
  logLevel: "info",
  pugPaths: ["./src/views"], // multiple roots
  viewsRoot: "./src/views", // default views root
  typesPath: "./src/types", // default types path
  sharedLocals: {
    importPath: "./src/types/sharedLocals.ts",
    typeName: "SharedLocals"
  }
};
