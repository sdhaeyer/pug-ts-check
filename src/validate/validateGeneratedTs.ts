import fs from "node:fs";
import path from "node:path";
import {  SyntaxKind, Diagnostic   } from "ts-morph";
import { Logger } from "../utils/Logger.js";
import type { MappedLine } from "../types/types.js"; // fix if needed

import {config} from "../config/config.js";
import * as ts from "typescript";
import { ParseError } from "../errors/ParseError.js";

import { getProjectContext } from "../cache/project-context.js";

export function validateGeneratedTs( tsSource: string, lineMap: MappedLine[], oriFilePath: string ):ParseError[]   {
    Logger.debug("Starting type-check of generated TypeScript...");
    
    //Logger.debug("Linemap : ");
    for (const [index, mapEntry] of lineMap.entries()) {
        //Logger.debug(`LineMap[${index}]: ${mapEntry.file}:${mapEntry.line}`);
    }

    
    const tmpDir = path.join(config.projectPath, config.tmpDir);
    const ctx = getProjectContext();
    const project = ctx.tsProject; 
    

    
    // ensure the tmp dir exists on disk
    fs.mkdirSync(tmpDir, { recursive: true });

    const virtualFileName = path.join(tmpDir, "VirtualGeneratedFile.ts");

    // note: this is just a *name*, does not exist on disk
    const sourceFile = project.createSourceFile(virtualFileName, tsSource, {
    overwrite: true,
    });
    
   

    //Logger.debug(`Loaded virtual file for type-checking: ${tmpPath}`);

    const diagnostics = sourceFile.getPreEmitDiagnostics();

    const errors: ParseError[] = [];
    for (const diag of diagnostics) {
        const pError = diagnosticToParseError(diag, oriFilePath, lineMap);
        if (!pError) {
            Logger.error("Failed to convert diagnostic to ParseError");
            Logger.info(`Diagnostic: ${JSON.stringify(diag.compilerObject, null, 2)}`);
            Logger.info(`Source! : tsSource: ${tsSource}    `);

            continue;
        }
        errors.push(pError);
    }


    return errors;
}

export function diagnosticToParseError(diagnostic: Diagnostic, oriFilePath: string, lineMap: MappedLine[]): ParseError  {
    const generatedSourceFile = diagnostic.getSourceFile();
    let pError = new ParseError("Init parseError", oriFilePath, -1, diagnostic);

    if (!generatedSourceFile) {
        Logger.error("No source file found for diagnostic");
        Logger.info(`Diagnostic: ${JSON.stringify(diagnostic.compilerObject, null, 2)}`);
        pError.pugLine = -1; // if no source file, set to 0
        pError.pugPath = oriFilePath; // use original file path
        pError.message = "No source file found for diagnostic: " + diagnostic.getMessageText();


        // pError.message= "No source file found for diagnostic";
        return pError;
        
    }

    const pos = diagnostic.getStart();
    const errorTypeCode = diagnostic.getCode();
    pError.errorTypeCode = errorTypeCode
    
    const rawMessage = diagnostic.compilerObject.messageText;
    const diagMessageText = diagnostic.getMessageText();

    const message = typeof diagMessageText === "string" ? diagMessageText : ts.flattenDiagnosticMessageText(rawMessage, "\n");

    if (pos != null) {
        const { line } = generatedSourceFile.getLineAndColumnAtPos(pos);
        const mapEntry = lineMap[line - 1]; // 1-based to 0-based
        if (mapEntry) {
            pError.pugLine = mapEntry.lineNumber 
            pError.pugPath = mapEntry.file;
            pError.message = message;
        } else {
            pError.pugLine = -1; // if no mapping found, set to 0
            pError.pugPath = oriFilePath; // use original file path
            pError.message = `No mapping found for line ${line} in ${generatedSourceFile.getFilePath()}. Original message: ${message}`;
            Logger.warn(`No mapping found for line ${line} in ${generatedSourceFile.getFilePath()}. Original message: ${message}`);
        }

        

    } else {
        pError.pugLine = -1; // if no position, set to 0
        pError.pugPath = oriFilePath; // use original file path
        pError.message = `No position found for diagnostic. Original message: ${message}`;
        Logger.warn(`No position found for diagnostic. Original message: ${message}`);
        
    }
    pError.type = "typescriptValidateErrors"; // Set type to "typecheck" for diagnostics
    

    return pError;
}

