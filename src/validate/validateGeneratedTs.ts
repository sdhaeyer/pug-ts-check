import fs from "node:fs";
import path from "node:path";
import {  SyntaxKind, Diagnostic   } from "ts-morph";
import { Logger } from "../utils/Logger.js";
import type { MappedLine } from "../types/types.js"; // fix if needed
import { getTsProject } from "./projectCache.js";
import {config} from "../config/config.js";
import * as ts from "typescript";



const errorCodeDescriptions: Record<number, string> = {
  2322: "TS2322: Type is not assignable to another type",
  2339: "TS2339: Property does not exist on type",
  2345: "TS2345: Argument of type X is not assignable to parameter of type Y",
  2304: "TS2304: Cannot find name",
  2551: "TS2551: Property does not exist on type but is optional",
  2552: "TS2552: Cannot find name; did you mean ...?",
  2693: "TS2693: 'X' only refers to a type, but is being used as a value here",
  7006: "TS7006: Parameter has an implicit 'any' type",
  7053: "TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type",
  7031: "TS7031: Binding element implicitly has an 'any' type",
};

export function validateGeneratedTs( tsSource: string, lineMap: MappedLine[], oriFilePath: string ):Diagnostic[]   {
    Logger.debug("Starting type-check of generated TypeScript...");

    //Logger.debug("Linemap : ");
    for (const [index, mapEntry] of lineMap.entries()) {
        //Logger.debug(`LineMap[${index}]: ${mapEntry.file}:${mapEntry.line}`);
    }

    
    const tmpDir = path.join(config.projectPath, config.tmpDir);
    const project = getTsProject();

    
    // ensure the tmp dir exists on disk
    fs.mkdirSync(tmpDir, { recursive: true });

    const virtualFileName = path.join(tmpDir, "VirtualGeneratedFile.ts");

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
    Logger.error(`OriFile: ${oriFilePath}`);

    for (const diag of diagnostics) {
        const pos = diag.getStart();
        const code = diag.getCode();
        console.log(`VGT-ERROR: ${code} (${errorCodeDescriptions[code] ?? "Uncommon TypeScript error ... got to look it op or expand table here ..."})`);

        const rawMessage = diag.compilerObject.messageText;
        const message =typeof diag.getMessageText() === "string"?  diag.getMessageText() : ts.flattenDiagnosticMessageText(rawMessage, "\n");

        if (pos != null) {
            const { line } = sourceFile.getLineAndColumnAtPos(pos);
            const mapEntry = lineMap[line - 1]; // 1-based to 0-based
      
            
            if (mapEntry) {
                console.log(`MAP: \x1b[33m${mapEntry.file}:${mapEntry.lineNumber}\x1b[0m`)
                console.log(`Message: \x1b[33m${message}\x1b[0m`)

                const sourceLines = sourceFile.getFullText().split(/\r?\n/);
                Logger.debug(`OriLine: ${line} - src : ${sourceLines[line - 1]}`);

                
                                
            } else {
                console.log(`At generated.ts:${line}\n${message}`);
            }
           
            if (!errorCodeDescriptions[code]) {
                console.warn(`⚠️  Uncommon TypeScript error code ${code} encountered. Please check the TypeScript documentation for more details.`);
                const snippetRadius = 2; // lines before/after

                const { line } = sourceFile.getLineAndColumnAtPos(pos);
                const sourceLines = sourceFile.getFullText().split(/\r?\n/);

                const snippetStart = Math.max(0, line - 1 - snippetRadius);
                const snippetEnd = Math.min(sourceLines.length, line + snippetRadius);

                console.log(`Code snippet around line ${line}:`);
                for (let i = snippetStart; i < snippetEnd; i++) {
                    const lineMarker = (i + 1 === line) ? "👉" : "  ";
                    console.log(`${lineMarker} ${i + 1}: ${sourceLines[i]}`);
                }

            }
            const node = sourceFile.getDescendantAtPos(pos);
            if (node) {
                const parent = node?.getParent();
                
                if (parent && parent.asKind(SyntaxKind.PropertyAccessExpression)) {
                    const pa = parent.asKindOrThrow(SyntaxKind.PropertyAccessExpression);  // narrows to PropertyAccessExpression
                    const expression = pa.getExpression();
                    const expressionType = expression.getType();
                    Logger.debug(`Expression: ${expression.getText()}`);
                    Logger.debug(`Parent expression type is: ${expressionType.getText()}`);

                    const symbol = expressionType.getSymbol();
                    if (expressionType.isClassOrInterface() &&  symbol) {

                        console.log(`Class or interface: ${symbol.getName()}`);

                        const declarations = symbol.getDeclarations();
                        declarations.forEach(decl => {
                            console.log(`At: ${decl.getSourceFile().getFilePath()}:${decl.getStartLineNumber()}`);
                        });
                        // print its members
                        const properties = expressionType.getProperties();
                        console.log(`Members:`);
                        for (const p of properties) {
                            console.log(`  - ${p.getName()}`);
                        }
                    }


                    
                }
               
            }

        }else {
            // If no position, just log the message
            console.log(` -> no position message: ${message}`);
        }
    }
    if(diagnostics.length > 0) {
        // Logger.error("Type errors detected in generated TypeScript");
        // throw new Error("Type errors detected in generated TypeScript");
    }

    return diagnostics;
}
