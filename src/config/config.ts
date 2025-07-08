
import { z } from "zod";

export const configSchema = z.object({
  tmpDir: z.string(),
  projectPath: z.string(),
  pugPaths: z.array(z.string()),
  logLevel: z.enum(["info", "debug", "warn", "error", "silent"]).optional(),
  typesPath: z.string(),
  viewsRoot: z.string()
});

type Config = z.infer<typeof configSchema>;

export const config: Config = {
  tmpDir: ".tmp",
  projectPath: ".",
  logLevel: "info",
  pugPaths: ["./src/views"], // multiple roots
  viewsRoot: "./src/views", // default views root
  typesPath: "./src/types", // default types path
};
