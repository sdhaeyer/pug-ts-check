// src/precompile/PugPrecompiler.ts

import type { PugAst, PugAstNode } from "../types/PugAst.js";

import path from "node:path";
import fs from "node:fs";
import lex from "pug-lexer";
import parse from "pug-parser";
import { Logger } from "../utils/Logger.js";
import { ParseError } from "../errors/ParseError.js";
import { config } from "../config/config.js";
import { error } from "node:console";
import { dependencyGraph } from "../cache/dependencyGraph.js";



export function precompilePug(filePath: string, fileSource?: string, caller?: string): { ast: PugAstNode | undefined, errors: ParseError[] } {
    const errors: ParseError[] = [];
    let ast: PugAst | undefined = undefined;
    const absolutePath = path.resolve(filePath);

    try {


        Logger.debug(`Precompiling Pug file: ${absolutePath}`);

        let source = "";
        if (!fileSource) {
            if (!fs.existsSync(absolutePath)) {
                errors.push(new ParseError(`Precompile: Pug file not found at path: ${absolutePath}`, absolutePath, 1));
                return { ast: undefined, errors };
            }
            source = fs.readFileSync(absolutePath, "utf8");
        } else {
            source = fileSource;

        }


        let tokens
        try {
            tokens = lex(source, { filename: absolutePath });
        } catch (err) {
            errors.push(new ParseError(`Precompile: Failed to lex Pug file: ${absolutePath} - ${err}`, absolutePath, -1));
            return { ast: undefined, errors };
        }

        ast = parse(tokens);
        if (!ast) {
            errors.push(new ParseError(`Precompile: Failed to parse Pug file: ${absolutePath}`, absolutePath, -1));
            return { ast: undefined, errors };
        }
        addFilenameToAst(ast, absolutePath);

        let includes: string[] = []

        function flatten(node: PugAstNode): PugAstNode {

            if (!node.filename) {
                Logger.warn(`Flattening node without filename: ${node.type} at ${node.line}`);
                throw new ParseError(`Flattening node without filename: ${node.type} at ${node.line}`, absolutePath, node.line ?? -1);
            }
            if (node.nodes && Array.isArray(node.nodes)) {
                for (const child of node.nodes) {
                    if (!child.filename) {
                        Logger.warn(`Flattening node with child without filename: ${node.filename} at ${node.line}`);
                        throw new ParseError(`Flattening node with child without filename`, node.filename, node.line ?? -1);

                    }
                }
            }


            Logger.debug(`Flattening node type: ${node.type} at ${node.filename}:${node.line}`);
            // eigenlijk moeten we elke node afgaan als er een extend is ...., dan moeten alle includes geprepend worden aan de nodes van de parent ast.

            if (node.nodes && Array.isArray(node.nodes)) {

                
                let extendBlock: PugAstNode | undefined;
                for (const child of node.nodes) {

                    if (child.type === "Extends") {
                        
                        extendBlock = child;
                        break;
                    }
                }
                if (extendBlock) {
                    Logger.debug(`Found extends block in ${node.filename} at line ${node.line}`);
                    const masterPath = resolvePugIncludePath(node.filename, extendBlock.file.path);
                    dependencyGraph.add(node.filename, masterPath); // add the dependency edge

                    const childPath = node.filename;

                    // eigenlijk zouden w ehier alle niet neame blocks moeten verzamelen , en misschien ondertussen ook de andere ... 
                    // die in een array steken ... ( de andere)
                    const otherBlocks: PugAstNode[] = [];
                    const childBlocks: Record<string, PugAstNode> = {};


                    for (const child of node.nodes) {
                        if (child.type === "NamedBlock" && child.name) {
                            childBlocks[child.name] = child;
                        } else if (child.type !== "Extends") {

                            // add to other blocks
                            otherBlocks.push(child);
                        }
                    }



                    Logger.debug(`Generating AST for parent...`);

                    if (!fs.existsSync(masterPath)) {
                        throw new ParseError(`Precompile: Pug file not found at path: ${masterPath}`, node.filename, node.line ?? -1);
                    }
                    const { ast: masterAst, errors: masterErrors } = precompilePug(masterPath);
                    if (masterErrors.length > 0) {
                        errors.push(...masterErrors);
                    }

                    if (!masterAst) {
                        throw new ParseError(`Precompile: Failed to precompile parent Pug file: ${masterPath}`, node.filename, node.line ?? -1);
                    }

                    function collectNamedBlocks(node: PugAstNode, store: Record<string, PugAstNode>) {
                        if (!node) return;

                        if ((node.type === "Block" || node.type === "NamedBlock") && node.name) {
                            store[node.name] = node;
                        }
                        if (node.nodes) {
                            node.nodes.forEach((child: PugAstNode) => collectNamedBlocks(child, store));
                        }
                        if (node.block) {
                            collectNamedBlocks(node.block, store);
                        }
                    }

                    // collect named blocks in parent
                    const mappedMasterBlocks: Record<string, PugAstNode> = {};
                    collectNamedBlocks(masterAst, mappedMasterBlocks);
                    Logger.debug(`Collected ${Object.keys(mappedMasterBlocks).length} blocks from parent.`);
                    Logger.debug(`Parent blocks: ${Object.keys(mappedMasterBlocks).join(", ")}`);


                    // in eached named block in the mast ast ... we will look if we find a child and then put the childs in there ... 
                    for (const blockName of Object.keys(mappedMasterBlocks)) {
                        if (childBlocks[blockName]) {
                            mappedMasterBlocks[blockName].nodes = childBlocks[blockName].nodes;
                        }
                    }

                    // we will also add the otherblocks

                    if (otherBlocks.length > 0) {
                        Logger.debug(`Adding ${otherBlocks.length} other blocks to parent AST.`);
                        if (masterAst.nodes) {
                            masterAst.nodes.unshift(...otherBlocks);
                        } else {
                            masterAst.nodes = otherBlocks;
                        }
                        // Add a comment node to indicate these blocks came from here
                        const commentNode = {
                            type: "Comment",
                            val: `Added ${otherBlocks.length} blocks from ${childPath}`,
                            filename: childPath,
                            line: 1,
                            column: 1
                        };
                        masterAst.nodes.unshift(commentNode);
                    }


                    return flatten(masterAst); // visit the new AST to process it

                }
            }

            if (node.type === "Include") {
                Logger.debug(`Found include in ${node.filename}:${node.line}`);
                // resolve include path
                const includePath = resolvePugIncludePath(node.filename, node.file.path);
                // now add the includes ... 

                Logger.debug(`START - Precompiling include: ${includePath}`);
                const { ast: includeAst, errors: includeErrors } = precompilePug(includePath);
                Logger.debug(`END - Precompiling include: ${includePath}`);
                errors.push(...includeErrors);
                dependencyGraph.add(node.filename, includePath); // add the dependency edge

                if (!includeAst) {
                    errors.push(new ParseError(`Precompile: Failed to precompile included Pug file: ${includePath}`, node.filename, -1));
                    return node; // return the original node if include fails

                } else {
                    Logger.debug(`Setting node to flattened precompiled node`);
                    return flatten(includeAst); // replace the current node with the include AST
                }
            }


            // default traversal
            if (node.nodes) {
                node.nodes = node.nodes.map(child => flatten(child));
            }
            if (node.block) {
                node.block = flatten(node.block);
            }

            return node; // return the modified node

        }

        const resp = flatten(ast);




        return { ast: resp, errors };

    } catch (err) {
        if (err instanceof ParseError) {
            errors.push(err);
            return { ast: undefined, errors };

        } else {
            Logger.error("❌ XYZ-- General error during parsing:", err);
            let pe = new ParseError(`Precompile: General error during parsing: ${err}`, absolutePath, -1);

            throw pe; // wrap in ParseError for consistency

        }
    }
}


/**
 * Recursively walks a Pug AST node tree and assigns a `filename` property
 * to every node, so you can track its origin precisely.
 */
export function addFilenameToAst(node: PugAstNode, currentFile: string) {
    if (!node) return;

    // ok maybe later maybe todo .. .add parents , so that if i dont find the filename i can walk up the tree
    node.filename = currentFile;
    if (node.block) {
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
        
        
        result += `${currentIndent}`;
        result += `[${node.type}]`;
        switch (node.type) {
            

            case "Tag":
                result += `{node.name}`;
                if (node.attrs && node.attrs.length > 0) {
                    const attrs = node.attrs.map((a: any) => `${a.name}=${a.val}`).join(" ");
                    result += `(${attrs})`;
                }
                result += "";
                break
            case "Text":
                result += `| ${node.val}`;
                break
            case "Code":
                result += `- ${node.val}`;
                break
            case "Each":
                result += `each ${node.val} in ${node.obj}`;
                break
            case "Block":
                if (node.name) {
                    result += `block ${node.name}`;
                } else {
                    // result += `${currentIndent}block\n`;
                }
                break
            case "Mixin":
                result += `mixin ${node.name}(${(node.args || "").trim()})`;
                break;
            case "NamedBlock":
                result += `block ${node.name}`;
                break;
            case "Comment":
                result += `// ${node.val}`;
                break;
            case "Conditional":
                result += `if (${node.test})`;
                if (node.consequent) visit(node.consequent, currentIndent + "  ");
                if (node.alternate) {
                    result += `\n${currentIndent}else`;
                    visit(node.alternate, currentIndent + "  ");
                }
                break;
            case "Include":
                if (node.file?.path) {
                    result += `include ${node.file?.path}`;
                } else {
                    result += `include (unknown path)`;
                }
                break;
            default:
                result += `// (logger)TODO: handle node type ${node.type}`;
        }
        const relPath = path.relative(process.cwd(), node.filename || "");
        // result += `\n${currentIndent}(${relPath}:${node.line})`;
        result += "\n"
        if (node.block) visit(node.block, currentIndent + "  ");
        if (node.nodes) {
            node.nodes.forEach(child => visit(child, currentIndent + "  "));
        }
    }

    visit(ast, indent);

    return result;
}


/**
 * Resolves a pug extends/include path correctly, respecting:
 * - absolute pug paths (starting with '/'), relative to viewsRoot
 * - relative paths, relative to currentFile
 */
export function resolvePugIncludePath(currentFile: string, pugPath: string): string {

    // maybe to ad multiple viewroots ... 
    let viewsRoot = path.join(config.projectPath, config.viewsRoot);


    if (pugPath.startsWith("/")) {
        // absolute pug path, relative to views root
        return path.join(viewsRoot, pugPath);
    } else {
        // relative path
        return path.resolve(path.dirname(currentFile), pugPath);
    }
}