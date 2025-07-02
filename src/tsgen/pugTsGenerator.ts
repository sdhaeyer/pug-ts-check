// src/tsgen/PugTsGenerator.ts

import type { PugAst, PugAstNode } from "../types/PugAst.js";
import { Logger } from "../utils/Logger.js";
import type { MappedLine, ParsedContract } from "../types/types.js";
import { rebaseImport } from "../utils/utils.js";




/**
 * Generate TypeScript source from Pug AST.
 * This is a simplified version that handles basic Pug constructs.
 */


export function generateTsFromPugAst(ast: PugAst, contract: ParsedContract): { tsSource: string; lineMap: MappedLine[] } {

    let indentLevel = 0;
    const indentString = "  ";  // two spaces

    let tsSource = "";
    const lineMap: MappedLine[] = [];


    function addLine(src: string, Map: MappedLine = { line: 0, file: "root" }) {
        Logger.debug(`Adding line: ${src} at ${Map.file}:${Map.line}`);
        const indentation = indentString.repeat(indentLevel);
        tsSource += indentation + src + "\n";
        lineMap.push({ line: Map.line, file: Map.file });

    }

    addLine("// Generated TypeScript from Pug AST");

    // Add contract imports
    for (const imp of contract.imports) {
        addLine(rebaseImport(imp), { line: 0, file: "contract" });
    }

   
    addLine(`export function render(locals: ${contract.rawExpects}) {`)
    indentLevel++;
    addLine(`const { ${Object.keys(contract.expects).join(", ")} } = locals;`)

    function visit(node: PugAstNode) {
        if (!node) return;
        Logger.debug(`Visiting node type: ${node.type}`, node);

        const map = { line: node.line ?? 0, file: node.filename || "unknown.pug" };
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
                addLine(`for (const ${node.val} of ${node.obj}) {`, map);
                indentLevel++;
                if (node.block) visit(node.block);
                indentLevel--;
                addLine("}", map);
                break;
            case "Code":
                addLine(`console.log(${node.val});`, map);
                break;
            case "Text":
                // treat interpolations as logs
                addLine(`console.log(\`${node.val}\`);`, map);
                break;
            case "Tag":
                // ignore tags except maybe push text from text children
                if (node.block) visit(node.block);
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
    
    return { tsSource, lineMap };
}