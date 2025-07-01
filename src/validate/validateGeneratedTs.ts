import fs from "node:fs";
import path from "node:path";
import { Project } from "ts-morph";
import { Logger } from "../utils/Logger.js";
import type { MappedLine, ParseOptions } from "../types/types.js"; // fix if needed

export function validateGeneratedTs( tsSource: string, lineMap: MappedLine[], options: ParseOptions = {} ):Diagnostic<ts.Diagnostic>[]   {
    Logger.debug("Starting type-check of generated TypeScript...");

    const projectPath = path.resolve(options.projectPath || ".");

    const tmpDir = path.join(projectPath, ".tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, "VirtualGeneratedFile.ts");
    fs.writeFileSync(tmpPath, tsSource, "utf8");

    const tsConfig = path.join(projectPath, "tsconfig.json");
    const project = new Project({
        tsConfigFilePath: tsConfig,
    });

    const sourceFile = project.addSourceFileAtPath(tmpPath);

    Logger.debug(`Loaded virtual file for type-checking: ${tmpPath}`);

    const diagnostics = project.getPreEmitDiagnostics();

    if (diagnostics.length === 0) {
        Logger.info("✅ Type checking passed with ts-morph!");
        return diagnostics;
    }

    Logger.error(`❌ Found ${diagnostics.length} pug typescript error(s):`);

    for (const diag of diagnostics) {
        const pos = diag.getStart();
        if (pos != null) {
            const { line } = sourceFile.getLineAndColumnAtPos(pos);
            const mapEntry = lineMap[line - 1]; // 1-based to 0-based
            const message = diag.getMessageText();
            if (mapEntry) {
                console.log(`ERROR: ${mapEntry.file}:${mapEntry.line} \n -> ${message}`);
            } else {
                console.log(`At generated.ts:${line}\n${message}`);
            }
        }
    }
    if(diagnostics.length > 0) {
        // Logger.error("Type errors detected in generated TypeScript");
        // throw new Error("Type errors detected in generated TypeScript");
    }

    return diagnostics;
}
