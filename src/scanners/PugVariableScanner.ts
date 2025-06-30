import { log } from "../utils/Logger.js";
import lex from "pug-lexer";
import parse from "pug-parser";
import * as acorn from "acorn";

/**
 * The result of scanning a Pug template.
 */
export interface ScannedVariables {
    variables: string[];       // top-level contract variables
    references: string[];      // all dotted references
}

/**
 * Scan a Pug source for all used variables and references, respecting context.
 */
export function scanPugVariables(pugSource: string): ScannedVariables {
    log("[pug-check-ts] Scanning variables in Pug...");

    const tokens = lex(pugSource);
    const ast = parse(tokens);

    const foundVars = new Set<string>();
    const foundRefs = new Set<string>();

    function visit(node: any, context: Record<string, string> = {}) {
        if (!node) return;

        log(`Visiting node type: ${node.type}`);

        if (node.type === "Each") {
            const val = node.val;
            const obj = node.obj;
            const newContext = { ...context };
            newContext[val] = `${obj}[LOOP]`;
            if (node.block && node.block.nodes) {
                node.block.nodes.forEach((child: any) => visit(child, newContext));
            }
            return;
        }

        if (node.type === "Code") {
            if (node.val && node.val.startsWith("var ")) {
                const varMatch = node.val.match(/var\s+(\w+)\s*=\s*(.+)/);
                if (varMatch) {
                    const varName = varMatch[1];
                    const expr = varMatch[2];
                    context[varName] = substitute(expr, context);
                }
            }
            extractIdentifiers(node.val, context);
        }

        if (node.type === "Expression") {
            extractIdentifiers(node.val, context);
        }

        if (node.type === "Text") {
            extractInterpolations(node.val, context);
        }

        if (node.type === "Tag" && node.attrs) {
            node.attrs.forEach((attr: any) => {
                extractIdentifiers(attr.val, context);
            });
        }

        // recurse into children
        if (node.block && node.block.nodes) {
            node.block.nodes.forEach((child: any) => visit(child, context));
        }
        if (node.type === "Block" && node.nodes) {
            node.nodes.forEach((child: any) => visit(child, context));
        }
    }

    /**
     * Substitute known context variables.
     */
    function substitute(expr: string, context: Record<string, string>): string {
        const parts = expr.split(".");
        if (parts.length === 0) return expr;
        const first = parts[0];
        if (context[first]) {
            return [context[first], ...parts.slice(1)].join(".");
        }
        return expr;
    }

    /**
     * Extract variable references from arbitrary JS expressions.
     */
    function extractIdentifiers(jsCode: string, context: Record<string, string>) {
        if (!jsCode) return;

        try {
            const ast = acorn.parseExpressionAt(jsCode, 0, { ecmaVersion: 2020 });
            walkAST(ast, context);
        } catch (e) {
            log(`⚠️  JS parse error in identifier scan: ${(e as any).message}`);
        }
    }

    /**
     * Walk an Acorn AST to extract identifiers
     */
    function walkAST(node: any, context: Record<string, string>) {
        switch (node.type) {
            case "Identifier": {
                const rewritten = substitute(node.name, context);
                foundRefs.add(rewritten);
                foundVars.add(rewritten.split(".")[0]);
                break;
            }
            case "MemberExpression": {
                let path: string[] = [];
                let current = node;
                while (current.type === "MemberExpression") {
                    if (current.property.type === "Identifier") {
                        path.unshift(current.property.name);
                    }
                    current = current.object;
                }
                if (current.type === "Identifier") {
                    path.unshift(current.name);
                }
                const joined = path.join(".");
                const resolved = substitute(joined, context);
                foundRefs.add(resolved);
                foundVars.add(resolved.split(".")[0]);
                break;
            }
            default: {
                for (const key in node) {
                    const child = node[key];
                    if (Array.isArray(child)) {
                        child.forEach(c => {
                            if (c && typeof c.type === "string") {
                                walkAST(c, context);
                            }
                        });
                    } else if (child && typeof child.type === "string") {
                        walkAST(child, context);
                    }
                }
            }
        }
    }

    /**
     * Interpolations like `#{user.name}`
     */
    function extractInterpolations(text: string, context: Record<string, string>) {
        if (!text) return;
        const regex = /#\{([^}]+)\}/g;
        let match;
        while ((match = regex.exec(text))) {
            extractIdentifiers(match[1], context);
        }
    }

    visit(ast);

    return {
        variables: Array.from(foundVars),
        references: Array.from(foundRefs),
    };
}
