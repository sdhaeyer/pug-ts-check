import fs from "node:fs";
import path from "node:path";
import { Project } from "ts-morph";
import { Logger } from "../utils/Logger.js";
import type { MappedLine, ParseOptions } from "../types/types.js"; // fix if needed
import type { Diagnostic } from "ts-morph";

import { getTsProject } from "./projectCache.js";
import {config} from "../config/config.js";

export function validateGeneratedTs( tsSource: string, lineMap: MappedLine[] ):Diagnostic[]   {
    Logger.debug("Starting type-check of generated TypeScript...");

    const projectPath = config.projectPath;

 
    const tsConfig = path.join(projectPath, "tsconfig.json");
    Logger.debug(`Using tsconfig at: ${tsConfig}`);
    const project = getTsProject();

    
    // ensure the tmp dir exists on disk
    fs.mkdirSync(config.tmpDir, { recursive: true });

    const virtualFileName = path.join(config.tmpDir, "VirtualGeneratedFile.ts");

    // note: this is just a *name*, does not exist on disk
    const sourceFile = project.createSourceFile(virtualFileName, tsSource, {
    overwrite: true,
    });
    
   

    //Logger.debug(`Loaded virtual file for type-checking: ${tmpPath}`);

    const diagnostics = sourceFile.getPreEmitDiagnostics();

    if (diagnostics.length === 0) {
        //Logger.info("✅ Type checking passed with ts-morph!");
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
        }else {
            // If no position, just log the message
            console.log(`ERROR: ${diag.getMessageText()}`);
        }
    }
    if(diagnostics.length > 0) {
        // Logger.error("Type errors detected in generated TypeScript");
        // throw new Error("Type errors detected in generated TypeScript");
    }

    return diagnostics;
}
