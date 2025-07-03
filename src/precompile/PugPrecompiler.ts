// src/precompile/PugPrecompiler.ts

import type { PugAst, PugAstNode } from "../types/PugAst.js";

import path from "node:path";
import fs from "node:fs";
import lex from "pug-lexer";
import parse from "pug-parser";
import { Logger } from "../utils/Logger.js";
import { ParseError } from "../errors/ParseError.js";



export function precompilePug(filePath: string, fileSource?: string, caller?: string): PugAst {
    const absolutePath = path.resolve(filePath);
    Logger.debug(`Precompiling Pug file: ${absolutePath}`);

    let source = "";
     if (!fileSource) {
        if (!fs.existsSync(absolutePath)) {
            throw new ParseError(`Precompile: Pug file not found at path: ${absolutePath}`, absolutePath, 1);
        }
        source = fs.readFileSync(absolutePath, "utf8");
     }else{
        source = fileSource;

     }
        
    const tokens = lex(source);
    let ast: PugAst = parse(tokens);
    addFilenameToAst(ast, absolutePath);

    let includes: string[] = []

    function visit(node: PugAstNode, currentFile: string) {
        if (!node) return;
        Logger.debug(`Visiting node type: ${node.type} at ${currentFile.split(path.sep).pop()}:${node.line}`);

        if (node.type === "Include") {

            // resolve include path
            const includePath = path.resolve(path.dirname(currentFile), node.file.path);
            includes.push(includePath);

            // we have to handle includes at top level
        }

        if (node.type === "Extends") {
            const parentPath = path.resolve(path.dirname(currentFile), node.file.path);
            Logger.debug(`Extending: ${parentPath}`);

            Logger.debug(`Generating AST for parent...`);

            if (!fs.existsSync(parentPath)) {
                throw new ParseError(`Precompile: Pug file not found at path: ${parentPath}`, currentFile, node.line??-1);
            }
            const parentAst = precompilePug(parentPath);
            Logger.debug(`Generated AST for parent: ${parentPath}`);

            // patch parent AST with filename info // niet nodig want gebeurt in the precompile
            // addFilenameToAst(parentAst, parentPath);

            // collect blocks in parent
            const parentBlocks: Record<string, PugAstNode> = {};
            function collectBlocks(node: PugAstNode, store: Record<string, PugAstNode>) {
                if (!node) return;
                Logger.debug(`Collecting blocks from node type: ${node.type} node name: ${node.name || "N/A"} `);
                //console.log("currennode: ", node)
                if ((node.type === "Block" || node.type === "NamedBlock") && node.name) {
                    Logger.debug(`Found parent block: `, node);
                    store[node.name] = node;
                }
                if (node.nodes) {
                    node.nodes.forEach((child: PugAstNode) => collectBlocks(child, store));
                }
                if (node.block) {
                    collectBlocks(node.block, store);
                }
            }
            collectBlocks(parentAst, parentBlocks);
            Logger.debug(`Collected ${Object.keys(parentBlocks).length} blocks from parent.`);
            Logger.debug(`Parent blocks: ${Object.keys(parentBlocks).join(", ")}`);

            // collect blocks from the child (the one doing the extend)
            const childBlocks: Record<string, PugAstNode> = {};
            // only pick block nodes at the *root* of the child
            ast.nodes.forEach((n: PugAstNode) => {
                Logger.debug(`Collecting child block: ${n.type} with name: ${n.name || "N/A"}`);
                if (n.type === "NamedBlock" && n.name) {
                    Logger.debug("Found child block:", n);
                    Logger.debug(`Child block name: ${n.name}`);
                    if (!n.filename) {
                        Logger.warn(`Chilblock file name not knwo should be knwon no? `);
                    }
                    childBlocks[n.name] = n;
                }
            });
            Logger.debug(`Collected ${Object.keys(childBlocks).length} blocks from child.`);
            Logger.debug(`Child blocks: ${Object.keys(childBlocks).join(", ")}`);

            // replace parent blocks with child overrides
            for (const blockName of Object.keys(parentBlocks)) {
                if (childBlocks[blockName]) {
                    // override the parent's block nodes
                    parentBlocks[blockName].nodes = childBlocks[blockName].nodes;
                    // parentBlocks[blockName].filename = absolutePath; // attach filename info to the parent block
                    // attach filename info to the overriding child nodes
                    childBlocks[blockName].nodes?.forEach((child: any) => {
                        child.filename = absolutePath;
                    });
                }
            }

            ast = parentAst; // replace the current AST with the extended one
            visit(ast, parentPath); // visit the new AST to process it
            return;
        }

        // default traversal
        if (node.nodes) {
            node.nodes.forEach(child => visit(child, currentFile));
        }
        if (node.block) {
            visit(node.block, currentFile);
        }


    }

    visit(ast, absolutePath);


    // now add the includes ... 
    for (const includePath of includes) {
        Logger.debug(`Processing include: ${includePath}`);
        const includeAst = precompilePug(includePath);
        addFilenameToAst(includeAst, includePath);

        // merge the include AST into the main AST
        if (ast.nodes) {
            ast.nodes = [...includeAst.nodes, ...(ast.nodes || [])];
        } else {
            ast.nodes = includeAst.nodes;
        }
    }




    return ast;
}


/**
 * Recursively walks a Pug AST node tree and assigns a `filename` property
 * to every node, so you can track its origin precisely.
 */
export function addFilenameToAst(node: PugAstNode, currentFile: string) {
    if (!node) return;

    // ok maybe later maybe todo .. .add parents , so that if i dont find the filename i can walk up the tree
    node.filename = currentFile;
    if(node.block) {
        addFilenameToAst(node.block, currentFile);
    }

    if (node.nodes && Array.isArray(node.nodes)) {
        node.nodes.forEach((child: PugAstNode) => addFilenameToAst(child, currentFile));
    }

    // dont know if below is neccesary ... 
    // handle attributes on tags:
    if (node.attrs && Array.isArray(node.attrs)) {
        node.attrs.forEach((attr: any) => {
            if (attr && typeof attr === "object") {
                attr.filename = currentFile;
            }
        });
    }

    if (node.alternate) addFilenameToAst(node.alternate, currentFile);
    if (node.consequent) addFilenameToAst(node.consequent, currentFile);

    if (node.whens && Array.isArray(node.whens)) {
        for (const when of node.whens) {
            if (when.block) addFilenameToAst(when.block, currentFile);
        }
    }

    if (node.nodes && Array.isArray(node.nodes)) {
        node.nodes.forEach(child => addFilenameToAst(child, currentFile));
    }

    
    if (node.attributeBlocks && Array.isArray(node.attributeBlocks)) {
        node.attributeBlocks.forEach(block => {
            if (typeof block === "object" && block !== null) {
                block.filename = currentFile;
            }
        });
    }


}

export function stringifyPugAst(ast: PugAstNode, indent: string = ""): string {
    let result = "";

    function visit(node: PugAstNode, currentIndent: string) {
        if (!node) return;
        //result += `node type: ${node.type} \n`

        switch (node.type) {
            case "Tag":
                result += `${currentIndent}${node.name}`;
                if (node.attrs && node.attrs.length > 0) {
                    const attrs = node.attrs.map((a: any) => `${a.name}=${a.val}`).join(" ");
                    result += `(${attrs})`;
                }
                result += "\n";
                break
            case "Text":
                result += `${currentIndent}| ${node.val}\n`;
                break
            case "Code":
                result += `${currentIndent}- ${node.val}\n`;
                break
            case "Each":
                result += `${currentIndent}each ${node.val} in ${node.obj}\n`;
                break
            case "Block":
                if (node.name) {
                    result += `${currentIndent}block ${node.name}\n`;
                } else {
                    // result += `${currentIndent}block\n`;
                }
                break
            case "Mixin":
                result += `${currentIndent}mixin ${node.name}(${(node.args || "").trim()})\n`;
                break;
            case "NamedBlock":
                result += `${currentIndent}block ${node.name}\n`;
                break;
            case "Comment":
                result += `${currentIndent}// ${node.val}\n`;
                break;
            default:
                result += `${currentIndent}// TODO: handle node type ${node.type}\n`;
        }
        if (node.block) visit(node.block, currentIndent + "  ");
        if (node.nodes) {
            node.nodes.forEach(child => visit(child, currentIndent + "  "));
        }
    }

    visit(ast, indent);

    return result;
}