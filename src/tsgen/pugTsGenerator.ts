// src/tsgen/PugTsGenerator.ts
import type { PugAstNode } from "../types/PugAst.js";
import { Logger } from "../utils/Logger.js";
import { LineMap, type MappedLine, type ParsedContract, type GeneratedMapping } from "../types/types.js";
import { extractNames } from "../utils/utils.js";

import { Config } from "../config/config.js";

export interface SharedLocalsMeta {
    fields: string[];
    importline: string;
}

/**
 * Generate TypeScript source from Pug AST.
 * This is a simplified version that handles basic Pug constructs.
 */


export function generateTsFromPugAst(ast: PugAstNode, contract: ParsedContract, sharedLocalsMeta: SharedLocalsMeta, config: Config): { tsSource: string; lineMap: MappedLine[]; mappings: GeneratedMapping[] } {

    const mappings: GeneratedMapping[] = [];
    const lineMap = new LineMap();
    const addSharedFieldsIsEnabled = sharedLocalsMeta.fields.length > 0

    lineMap.addLine("// Generated TypeScript from Pug AST");

    // Add import for shared locals if defined and not already included
    if (addSharedFieldsIsEnabled) {
        lineMap.addLine(sharedLocalsMeta.importline);

    }
    const sharedFields = sharedLocalsMeta.fields;
    const viewFields = extractNames(contract.rawExpects);
    const allFields = [...new Set([...sharedFields, ...viewFields])];

    // Add contract imports
    for (const impObj of contract.imports) {
        lineMap.addLine(impObj.getAbsoluteImportStatement(), { lineNumber: impObj.lineNumber, file: impObj.file });
        
        // Extract imported symbols and create mappings
        const importStmt = impObj.getAbsoluteImportStatement();
        const importRegex = /(?:import\s+type\s+)?(?:\{([^}]+)\}|(\w+))/;
        const match = importStmt.match(importRegex);
        
        if (match && match[1]) {
            // Named imports: { Symbol1, Symbol2 as Alias }
            const names = match[1].split(',').map(n => n.trim());
            for (const name of names) {
                const symbol = name.split(/\s+as\s+/)[0].trim();
                if (symbol) {
                    mappings.push({
                        pugFile: impObj.file,
                        pugLine: (impObj.lineNumber ?? 1) - 1,
                        symbol: symbol,
                        type: 'class',  // Types are imported from other files
                        tsLine: lineMap.list.length - 1,
                        pugContext: `import statement`
                    });
                }
            }
        } else if (match && match[2]) {
            // Default import
            mappings.push({
                pugFile: impObj.file,
                pugLine: (impObj.lineNumber ?? 1) - 1,
                symbol: match[2],
                type: 'class',
                tsLine: lineMap.list.length - 1,
                pugContext: `import statement`
            });
        }
    }

    let expectedType = contract.rawExpects
    if (addSharedFieldsIsEnabled) {
        expectedType = `${config.sharedLocals.typeName} & ${expectedType}`;
    }

    lineMap.addLine(`export function render(locals: ${expectedType}) {`, { lineNumber: contract.atExpectLine, file: contract.pugPath });
    lineMap.indentLevel++;
    
    // Add mappings for destructured fields from locals
    for (const field of allFields) {
        mappings.push({
            pugFile: contract.pugPath,
            pugLine: (contract.atExpectLine ?? 1) - 1, // Convert from 1-indexed to 0-indexed
            symbol: field,
            type: 'local',
            tsLine: lineMap.list.length + 1, // Current line will be next
            pugContext: `destructured from locals`
        });
    }
    
    lineMap.addLine(`const { ${allFields.join(", ")} } = locals;`, { lineNumber: contract.atExpectLine, file: contract.pugPath });

     function visit(node: PugAstNode) {
        // Helper to extract symbols from expressions and create mappings
        function addSymbolMappings(expr: string | undefined, pugFile: string, pugLine: number, context: string) {
            if (!expr) return;
            
            // Convert from 1-indexed (Pug parser) to 0-indexed (VS Code)
            const zeroIndexedLine = (pugLine ?? 1) - 1;
            
            // Get the current TS line that was just generated
            const currentTsLineIndex = lineMap.list.length - 1;
            const lastGeneratedTsLine = lineMap.tsSource.split('\n')[currentTsLineIndex] || '';
            
            // Simple regex to find identifiers (alphanumeric, underscore, $, not starting with digit)
            const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
            let match;
            while ((match = identifierRegex.exec(expr)) !== null) {
                const symbol = match[1];
                
                // Skip reserved words and common keywords
                const reserved = ['for', 'const', 'if', 'else', 'true', 'false', 'null', 'undefined', 'new', 'function', 'return'];
                if (!reserved.includes(symbol)) {
                    // Find where this symbol appears in the generated TS line
                    const tsColumnPos = lastGeneratedTsLine.indexOf(symbol);
                    
                    mappings.push({
                        pugFile: pugFile,
                        pugLine: zeroIndexedLine,
                        symbol: symbol,
                        type: 'reference',
                        tsLine: currentTsLineIndex,
                        tsColumn: tsColumnPos >= 0 ? tsColumnPos : undefined,  // Position in TS line
                        pugContext: context
                    });
                }
            }
        }
        if (!node) return;
        // Logger.debug(`Visiting node type: ${node.type}`);

        if (!node.filename) {
            Logger.warn(`Node ${node.type} at line ${node.line} has no filename. This may cause issues with line mapping.`);
            node.filename = "unknown.pug";  // fallback filename
        }

        const map = { lineNumber: node.line ?? 0, file: node.filename };
        switch (node.type) {
            case "Mixin":
                if (node.block) {
                    // definition
                    lineMap.addLine(`function ${node.name}(${node.args || ""}) {`, map);
                    lineMap.indentLevel++;
                    visit(node.block);
                    lineMap.indentLevel--;
                    lineMap.addLine("}", map);
                } else {
                    // call
                    lineMap.addLine(`${node.name}(${node.args || ""});`, map);
                }
                break;
            case "Each":
                if (node.key) {
                    // key present = index
                    lineMap.addLine(`for (const [${node.key}, ${node.val}] of ${node.obj}.entries()) {`, map);
                    addSymbolMappings(`${node.obj}`, node.filename, node.line ?? 0, `each object`);
                } else {
                    // no key
                    lineMap.addLine(`for (const ${node.val} of ${node.obj}) {`, map);
                    addSymbolMappings(`${node.obj}`, node.filename, node.line ?? 0, `each object`);
                }
                lineMap.indentLevel++;
                if (node.block) visit(node.block);
                lineMap.indentLevel--;
                lineMap.addLine("}", map);
                break;
            case "Code":

                if (node.buffer) {
                    // means an = expression
                    lineMap.addLine(`console.log(${node.val});`, map);
                    addSymbolMappings(node.val, node.filename, node.line ?? 0, `code expression`);
                } else {
                    // means a - code block
                    lineMap.addLine(`${node.val}`, map);
                    addSymbolMappings(node.val, node.filename, node.line ?? 0, `code statement`);
                }
                break;
            case "Text":
                // treat interpolations as logs
                lineMap.addLine(`console.log(\`${node.val}\`); // case text`, map);
                break;
            case "Tag":
                if (node.name === "script") {
                    Logger.debug("Skipping script block");
                    break;
                }

                // ✅ NEW: handle tag attributes like href=extraData.checkoutUrl
                if (node.attrs) {
                    for (const attr of node.attrs) {
                        lineMap.addLine(`console.log(${attr.val}); // from ${attr.name} attr`, map);
                        addSymbolMappings(attr.val, node.filename, node.line ?? 0, `tag attribute ${attr.name}`);
                    }
                }

                if (node.block) visit(node.block);
                break;

            case "NamedBlock":
            case "Block":
                if (node.nodes) node.nodes.forEach(visit);
                break;
            case "Conditional":
                lineMap.addLine(`if (${node.test}) {`, map);
                addSymbolMappings(node.test, node.filename, node.line ?? 0, `conditional test`);
                lineMap.indentLevel++;
                if (node.consequent) visit(node.consequent);
                lineMap.indentLevel--;
                if (node.alternate) {
                    lineMap.addLine(`} else {`, map);
                    lineMap.indentLevel++;
                    visit(node.alternate);
                    lineMap.indentLevel--;
                }
                lineMap.addLine("}", map);
                break;
            default:
                // handle other node types
                lineMap.addLine(`// TODO handle ${node.type}`, map);
                break;
        }


    }

    visit(ast);
    lineMap.indentLevel--;
    lineMap.addLine("}");

    Logger.debug("Linemap : ");
    for (const [index, mapEntry] of lineMap.list.entries()) {
        // Logger.debug(`LineMap[${index}]: ${mapEntry.file}:${mapEntry.lineNumber}`);
    }

    const ss = lineMap.tsSource;
    const LL = lineMap.list
    return { tsSource: ss, lineMap: LL, mappings };
}