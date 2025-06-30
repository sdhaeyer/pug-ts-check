import { log } from "../utils/Logger.js";
import { Project } from "ts-morph";
import path from "node:path";
import fs from "node:fs";

import { ContractParseError } from "../errors/ContractParseError.js";

export interface ParsedContract {
    imports: Array<string>;
    expects: Record<string, string>;
}


export interface ParseOptions {
  projectPath?: string; // allow to override for tests
}

/**
 * Parse //@import and //@expect from pug source
 */
export function parseContractComments(pugSource: string,  options: ParseOptions = {}): ParsedContract {
    log("Parsing contract annotations in Pug...");

    const projectPath = path.resolve(options.projectPath || ".");
    const lines = pugSource.split("\n");

    const imports: ParsedContract["imports"] = [];
    let expectsText: string | null = null;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("//@")) {
            const ruleText = trimmed.slice(3).trim(); // remove '//@'

            if (ruleText.startsWith("import")) {
                if (!ruleText.startsWith("import type")) {
                    log(`⚠️  Consider using 'import type' to avoid runtime imports in contracts: ${ruleText}`);
                }
                imports.push(ruleText);
            }

            if (ruleText.startsWith("expect")) {
                if (expectsText !== null) {
                    throw new ContractParseError("ContractParseError: Multiple //@expect blocks found; only one allowed.");
                }
                const expectMatch = ruleText.match(/expect\s+(.*)/);
                if (expectMatch) {
                    expectsText = expectMatch[1].trim();
                }
            }
        }
    }

    if (!expectsText) {
        throw new ContractParseError("No expect block found. Please add a //@ expect { ... } comment to your Pug file.");
    }

    // build the virtual file exactly with user-provided imports
    let fileSource = "";
    for (const importLine of imports) {
        fileSource += `${importLine}\n`;
    }
    fileSource += `type ExpectContract = ${expectsText};\n`;


    // store to .tmp under projectPath
    const tmpDir = path.join(projectPath, ".tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, "VirtualExpectFile.ts");
    fs.writeFileSync(tmpPath, fileSource, "utf8");


    // setup ts-morph
    const tsConfig = path.join(projectPath, "tsconfig.json");
    const project = new Project({
        tsConfigFilePath: tsConfig,
    });


    const sourceFile = project.addSourceFileAtPath(tmpPath);

    const typeAlias = sourceFile.getTypeAliasOrThrow("ExpectContract");
    const type = typeAlias.getType();

    if (!type.isObject()) {
        throw new ContractParseError("ContractParseError: //@expect must describe an object type.");
    }

    const props = type.getProperties();
    const expects: Record<string, string> = {};

    for (const prop of props) {
        const name = prop.getName();
        const declarations = prop.getDeclarations();
        const typeNode = declarations[0];
        const typeAtLoc = prop.getTypeAtLocation(typeNode);

        const symbol = typeAtLoc.getSymbol();
        if (!symbol) {
            throw new ContractParseError(`ContractParseError: Unknown type referenced in @expect: '${typeAtLoc.getText()}'`);
        }

        expects[name] = typeAtLoc.getText();
    }


    // TODO: warn about unused imported types
    // TODO: support shared references/transitive validation

    return { imports, expects };
}
