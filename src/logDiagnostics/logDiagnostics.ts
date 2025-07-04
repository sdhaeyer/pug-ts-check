import { SyntaxKind } from "ts-morph";
import { Logger } from "../utils/Logger";

import { ParseError } from "../errors/ParseError";
import path from "node:path";
import { config } from "../config/config";

export const errorCodeDescriptions: Record<number, string> = {
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


export function logParseError(errors: ParseError[], pugFile: string) {
    if (errors.length > 0) {
            Logger.error(`❌ ${pugFile} --failed type-check!`);
            
          } else {
            Logger.info(`✅  ${".\\" + path.relative(config.projectPath, pugFile)} passed type-check!`);
    }
    for (const error of errors) {
        var diagnostic = error.diagnostic;
        console.log("ERROR: " + error.type);
        console.log("ORIFILE: " + pugFile);
        console.log(`MAP: \x1b[32m${error.pugPath}:${error.pugLine}\x1b[0m`)
        console.log(`Message: \x1b[33m${error.message}\x1b[0m`)

        if (diagnostic) {
            const errorTypeCode = diagnostic.getCode();
            if (errorTypeCode) {
                if (!errorCodeDescriptions[errorTypeCode]) {
                   console.warn(`⚠️  Uncommon TypeScript error code ${errorTypeCode} encountered. Please check the TypeScript documentation for more details.`);
                }
                console.log(`VGT-ERROR: ${error.errorTypeCode} (${errorCodeDescriptions[errorTypeCode] ?? "Uncommon TypeScript error ... got to look it op or expand table here ..."})`);
            }
            const generatedSourceFile = diagnostic.getSourceFile();
            if (!generatedSourceFile) {
                Logger.error("No source file found for diagnostic");
                continue;

            }
            
            const sourceLines = generatedSourceFile.getFullText().split(/\r?\n/);
            const pos = diagnostic.getStart();
            if (!pos) {
                Logger.error("No position found for diagnostic");
                continue;
            }
            const { line } = generatedSourceFile.getLineAndColumnAtPos(pos);
            

            Logger.debug(`OriLine: ${line} - src : ${sourceLines[line - 1]}`);
            
            const snippetRadius = 5; // lines before/after
            logSnippet(line, snippetRadius, sourceLines);

           
            const node = generatedSourceFile.getDescendantAtPos(pos);
            if (node) {
                const parent = node?.getParent();

                if (parent && parent.asKind(SyntaxKind.PropertyAccessExpression)) {
                    const pa = parent.asKindOrThrow(SyntaxKind.PropertyAccessExpression);  // narrows to PropertyAccessExpression
                    const expression = pa.getExpression();
                    const expressionType = expression.getType();
                    Logger.debug(`Expression: ${expression.getText()}`);
                    Logger.debug(`Parent expression type is: ${expressionType.getText()}`);

                    const symbol = expressionType.getSymbol();
                    if (expressionType.isClassOrInterface() && symbol) {

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

        }

    }
}


export function logSnippet(line: number, snippetRadius: number, sourceLines: string[] ){
    const snippetStart = Math.max(0, line - 1 - snippetRadius);
    const snippetEnd = Math.min(sourceLines.length, line + snippetRadius);

    Logger.info(`Code snippet around line ${line}:`);
    for (let i = snippetStart; i < snippetEnd; i++) {
        const lineMarker = (i + 1 === line) ? "👉" : "  ";
        Logger.info(`${lineMarker} ${i + 1}: ${sourceLines[i]}`);
    }
}