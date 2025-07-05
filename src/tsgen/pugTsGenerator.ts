// src/tsgen/PugTsGenerator.ts

import type { PugAst, PugAstNode } from "../types/PugAst.js";
import { Logger } from "../utils/Logger.js";
import type { MappedLine, ParsedContract } from "../types/types.js";
import { config } from "../config/config.js";
import path from "node:path";





/**
 * Generate TypeScript source from Pug AST.
 * This is a simplified version that handles basic Pug constructs.
 */


export function generateTsFromPugAst(ast: PugAst, contract: ParsedContract): { tsSource: string; lineMap: MappedLine[] } {

    let indentLevel = 0;
    const indentString = "  ";  // two spaces

    let tsSource = "";
    const lineMap: MappedLine[] = [];


    function addLine(src: string, map: MappedLine = { lineNumber: 0, file: "file/path/not/given" }, oriSrc?: string) {
        const lines = src.split(/\r?\n/);
        for (const line of lines) {

            const currentIndex = lineMap.length;

            Logger.debug(`[${currentIndex}] Adding line: "${line}" - From: ${map.file}:${map.lineNumber} :oriSrc : "${oriSrc || ""}"`);
            const indentation = indentString.repeat(indentLevel);
            tsSource += indentation + line + "\n";

            lineMap.push(map);
        }



    }

    addLine("// Generated TypeScript from Pug AST");



    // Add contract imports
    for (const imp of contract.absoluteImports) {
        addLine(imp, { lineNumber: 0, file: "contract" });
    }


    addLine(`export function render(locals: ${contract.rawExpects}) {`, { lineNumber: contract.atExpectLine, file: contract.pugPath });
    indentLevel++;
    addLine(`const { ${Object.keys(contract.virtualExpects).join(", ")} } = locals;`, { lineNumber: contract.atExpectLine, file: contract.pugPath });

    function visit(node: PugAstNode) {
        if (!node) return;
        Logger.debug(`Visiting node type: ${node.type}`);

        if (!node.filename) {
            Logger.warn(`Node ${node.type} at line ${node.line} has no filename. This may cause issues with line mapping.`);
            node.filename = "unknown.pug";  // fallback filename
        }

        const map = { lineNumber: node.line ?? 0, file: node.filename };
        switch (node.type) {
            case "Mixin":
                if (node.block) {
                    // definition
                    addLine(`function ${node.name}(${node.args || ""}) {`, map);
                    indentLevel++;
                    visit(node.block);
                    indentLevel--;
                    addLine("}", map);
                } else {
                    // call
                    addLine(`${node.name}(${node.args || ""});`, map);
                }
                break;
            case "Each":
                if (node.key) {
                    // key present = index
                    addLine(`for (const [${node.key}, ${node.val}] of ${node.obj}.entries()) {`, map);
                } else {
                    // no key
                    addLine(`for (const ${node.val} of ${node.obj}) {`, map);
                }
                indentLevel++;
                if (node.block) visit(node.block);
                indentLevel--;
                addLine("}", map);
                break;
            case "Code":

                if (node.buffer) {
                    // means an = expression
                    addLine(`console.log(${node.val});`, map);
                } else {
                    // means a - code block
                    addLine(`${node.val}`, map);
                }
                break;
            case "Text":
                // treat interpolations as logs
                addLine(`console.log(\`${node.val}\`); // case text`, map);
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
                addLine(`if (${node.test}) {`, map);
                indentLevel++;
                if (node.consequent) visit(node.consequent);
                indentLevel--;
                if (node.alternate) {
                    addLine(`} else {`, map);
                    indentLevel++;
                    visit(node.alternate);
                    indentLevel--;
                }
                addLine("}", map);
                break;
            default:
                // handle other node types
                addLine(`// TODO handle ${node.type}`, map);
                break;
        }


    }

    visit(ast);
    indentLevel--;
    addLine("}");

    Logger.debug("Linemap : ");
    for (const [index, mapEntry] of lineMap.entries()) {
        Logger.debug(`LineMap[${index}]: ${mapEntry.file}:${mapEntry.lineNumber}`);
    }

    return { tsSource, lineMap };
}