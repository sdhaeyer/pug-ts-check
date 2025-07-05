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



export function precompilePug(filePath: string, fileSource?: string, caller?: string): {ast: PugAst| undefined, errors: ParseError[]} {
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

        function visit(node: PugAstNode, currentFile: string, headAst: PugAstNode) {
            if (!node) return;
            Logger.debug(`Visiting node type: ${node.type} at ${currentFile.split(path.sep).pop()}:${node.line}`);
            // eigenlijk moeten we elke node afgaan als er een extend is ...., dan moeten alle includes geprepend worden aan de nodes van de parent ast. 

            if (node.nodes && Array.isArray(node.nodes)) {
                var hasExtend =false
                for (const child of node.nodes) {
                    if (child.type === "Extends") {
                        hasExtend = true;
                        break;
                    }
                }
                if (hasExtend) {
                    for (let i = node.nodes.length - 1; i >= 0; i--) {
                        const child = node.nodes[i];
                        if (child.type === "Include") {
                        // resolve include path
                        const includePath = resolvePugIncludePath(currentFile, child.file.path);
                        includes.push(includePath);
                        Logger.debug(`Found include page that extends: ${includePath}`);

                        // remove this node from the AST
                        node.nodes.splice(i, 1);
                        Logger.debug(`Removed include node from AST to prevent duplicate processing.`);
                        }
                    }
                }
            }
            if (node.type === "Include") {

                // resolve include path
                const includePath = resolvePugIncludePath(currentFile, node.file.path);
                includes.push(includePath);
                // we will add also the dependencies at the end ... 
                // we know now that is is not a root include ... we will expend it or so add it to
                // we have to handle includes at top level
            }

            if (node.type === "Extends") {
                let parentPath = resolvePugIncludePath(currentFile, node.file.path);


                Logger.debug(`Extending: ${parentPath}`);

                Logger.debug(`Generating AST for parent...`);

                if (!fs.existsSync(parentPath)) {
                    throw new ParseError(`Precompile: Pug file not found at path: ${parentPath}`, currentFile, node.line ?? -1);
                }
                const { ast: parentAst, errors: parentErrors } = precompilePug(parentPath);
                if (parentErrors.length > 0) {
                    errors.push(...parentErrors);
                }

                Logger.debug(`Generated AST for parent: ${parentPath}`);

                if (!parentAst) {
                    throw new ParseError(`Precompile: Failed to precompile parent Pug file: ${parentPath}`, currentFile, node.line ?? -1);
                }
                // patch parent AST with filename info // niet nodig want gebeurt in the precompile
                // addFilenameToAst(parentAst, parentPath);

                // collect blocks in parent
                const parentBlocks: Record<string, PugAstNode> = {};
                var indentLevel = 0;
                var indentString = "  "; // two spaces
                function collectParentBlocks(node: PugAstNode, store: Record<string, PugAstNode>) {
                    indentLevel++;
                    const indentation = indentString.repeat(indentLevel);
                    if (!node) return;
                    Logger.debug(`${indentation} ppp ${node.type} <${node.name || "N/A"}> `);
                    //console.log("currennode: ", node)
                    if ((node.type === "Block" || node.type === "NamedBlock") && node.name) {
                        Logger.debug(`${indentation} Found parent block: `, node);
                        store[node.name] = node;
                    }
                    if (node.nodes) {
                        node.nodes.forEach((child: PugAstNode) => collectParentBlocks(child, store));
                    }
                    if (node.block) {
                        collectParentBlocks(node.block, store);
                    }
                    indentLevel--;
                }
                Logger.debug(`Collecting parent blocks`);
                collectParentBlocks(parentAst, parentBlocks);
                Logger.debug(`Collected ${Object.keys(parentBlocks).length} blocks from parent.`);
                Logger.debug(`Parent blocks: ${Object.keys(parentBlocks).join(", ")}`);

                // collect blocks from the child (the one doing the extend)
                const childBlocks: Record<string, PugAstNode> = {};
                // only pick block nodes at the *root* of the child
                if (headAst.nodes && Array.isArray(headAst.nodes)) {
                    Logger.debug(`Collecting child blocks from node type: ${headAst.type} with name: ${headAst.name || "N/A"}`);
                    headAst.nodes.forEach((n: PugAstNode) => {
                        Logger.debug(`Collecting child block: ${n.type} with name: ${n.name || "N/A"}`);
                        if (n.type === "NamedBlock" && n.name) {
                            Logger.debug("Found child block!!");
                            Logger.debug(`Child block name: ${n.name}`);
                            if (!n.filename) {
                                Logger.warn(`Child block file name not known should be known no? `);
                            }
                            childBlocks[n.name] = n;
                        }
                    });
                    Logger.debug(`Collected ${Object.keys(childBlocks).length} blocks from child.`);
                    Logger.debug(`Child blocks: ${Object.keys(childBlocks).join(", ")}`);
                }
                Logger.debug(`Replacing parent blocks with child overrides if they exist`);
                // replace parent blocks with child overrides
                for (const blockName of Object.keys(parentBlocks)) {
                    if (childBlocks[blockName]) {
                        Logger.debug(`Replacing parent block "${blockName}" with child block.`);
                        // override the parent's block nodes
                        parentBlocks[blockName].nodes = childBlocks[blockName].nodes;
                        childBlocks[blockName].nodes?.forEach((child: any) => {
                            child.filename = absolutePath;
                        });
                    }
                }
                dependencyGraph.add(absolutePath, parentPath); // add the dependency edge
                ast = parentAst; // replace the current AST with the extended one and start all over ... 
                visit(parentAst, parentPath,parentAst); // visit the new AST to process it
                return;
            }

            // default traversal
            if (node.nodes) {
                node.nodes.forEach(child => visit(child, currentFile, headAst));
            }
            if (node.block) {
                visit(node.block, currentFile, headAst);
            }


        }

        visit(ast, absolutePath, ast);


        // now add the includes ... 
        for (const includePath of includes) {
            Logger.debug(`Processing include: ${includePath}`);
            const {ast:includeAst, errors:includeErrors} = precompilePug(includePath);
            errors.push(...includeErrors);
            dependencyGraph.add(absolutePath, includePath); // add the dependency edge


            if (!includeAst) {
                errors.push(new ParseError(`Precompile: Failed to precompile included Pug file: ${includePath}`, absolutePath, -1));
                return { ast: undefined, errors };
                
            }
            addFilenameToAst(includeAst, includePath);

            // merge the include AST into the main AST
            if (ast.nodes) {
                ast.nodes = [...includeAst.nodes, ...(ast.nodes || [])];
            } else {
                ast.nodes = includeAst.nodes;
            }
        }




        return {ast, errors};

    } catch (err) {
        if (err instanceof ParseError) {
            errors.push(err);
            return { ast:undefined, errors };
 
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
                result += `${currentIndent}// (logger)TODO: handle node type ${node.type}\n`;
        }
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
export function resolvePugIncludePath( currentFile: string, pugPath: string ): string {

    // maybe to ad multiple viewroots ... 
    let viewsRoot = path.join(config.projectPath,   config.viewsRoot) ;

    
    if (pugPath.startsWith("/")) {
        // absolute pug path, relative to views root
        return path.join(viewsRoot, pugPath);
    } else {
        // relative path
        return path.resolve(path.dirname(currentFile), pugPath);
    }
}