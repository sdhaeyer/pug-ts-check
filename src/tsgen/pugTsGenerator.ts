// src/tsgen/PugTsGenerator.ts

import type { PugAst, PugAstNode } from "../types/PugAst.js";
import { Logger } from "../utils/Logger.js";
import { LineMap, type MappedLine, type ParsedContract } from "../types/types.js";
import { config } from "../config/config.js";
import path from "node:path";
import { extractNames } from "../utils/utils.js";





/**
 * Generate TypeScript source from Pug AST.
 * This is a simplified version that handles basic Pug constructs.
 */


export function generateTsFromPugAst(ast: PugAstNode, contract: ParsedContract): 
    { tsSource: string; lineMap: MappedLine[] } {

    
    const lineMap = new LineMap();


    lineMap.addLine("// Generated TypeScript from Pug AST");



    // Add contract imports
    for (const impObj of contract.imports) {
        lineMap.addLine(impObj.getAbsoluteImportStatement(), { lineNumber: impObj.lineNumber, file: impObj.file });
    }
   

    lineMap.addLine(`export function render(locals: ${contract.rawExpects}) {`, { lineNumber: contract.atExpectLine, file: contract.pugPath });
    lineMap.indentLevel++;
    lineMap.addLine(`const { ${extractNames(contract.rawExpects).join(", ")} } = locals;`, { lineNumber: contract.atExpectLine, file: contract.pugPath });

    function visit(node: PugAstNode) {
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
                } else {
                    // no key
                    lineMap.addLine(`for (const ${node.val} of ${node.obj}) {`, map);
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
                } else {
                    // means a - code block
                    lineMap.addLine(`${node.val}`, map);
                }
                break;
            case "Text":
                // treat interpolations as logs
                lineMap.addLine(`console.log(\`${node.val}\`); // case text`, map);
                break;
            case "Tag":
                if (node.name === "script") {
                    // do not visit children of script tags, or handle separately
                    Logger.debug("Skipping script block");

                } else {
                    // ignore tags except maybe push text from text children
                    if (node.block) visit(node.block);
                }
                break;

            case "NamedBlock":
            case "Block":
                if (node.nodes) node.nodes.forEach(visit);
                break;
            case "Conditional":
                lineMap.addLine(`if (${node.test}) {`, map);
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
    return { tsSource:ss , lineMap:LL };
}