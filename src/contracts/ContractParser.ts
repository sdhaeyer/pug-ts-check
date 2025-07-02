import { Logger } from "../utils/Logger.js";
import { Project } from "ts-morph";
import path from "node:path";
import fs from "node:fs";

import { ParseError } from "../errors/ParseError.js";
import type { ParseOptions, ParsedContract } from "../types/types.js"; // fix if needed
import { rebaseImport } from "../utils/utils.js";


/**
 * Parse //@import and //@expect from pug source
 */
export function parseContractComments(pugPath: string, pugSource?: string, options?: ParseOptions): ParsedContract {
    Logger.debug("Parsing contract annotations in Pug...");
    let projectPath ="."
    if  (options?.projectPath) {
        Logger.debug(`Using project path: ${options.projectPath}`);
        projectPath = path.resolve(options.projectPath || ".");
    }
    
    const tmpDir = path.join(projectPath, ".tmp");

   
    
    if (!pugSource) {

        if (!fs.existsSync(pugPath)) {
            throw new ParseError(`ContractParseError: Pug file not found at path: ${pugPath}`);
        }
        pugSource = fs.readFileSync(pugPath, "utf8");
    }


   
    const lines = pugSource.split("\n");

    const imports: ParsedContract["imports"] = [];
    let rawExpects: string | null = null;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("//@")) {
            const ruleText = trimmed.slice(3).trim(); // remove '//@'

            if (ruleText.startsWith("import")) {
                if (!ruleText.startsWith("import type")) {
                    Logger.warn(`⚠️  Consider using 'import type' to avoid runtime imports in contracts: ${ruleText}`);
                }
                imports.push(ruleText);
            }

            if (ruleText.startsWith("expect")) {
                if (rawExpects !== null) {
                    throw new ParseError("ContractParseError: Multiple //@expect blocks found; only one allowed.");
                }
                const expectMatch = ruleText.match(/expect\s+(.*)/);
                if (expectMatch) {
                    rawExpects = expectMatch[1].trim();
                }
            }
        }
    }

    if (!rawExpects) {
        throw new ParseError("No expect block found. Please add a //@ expect { ... } comment to your Pug file.");
    }

    // build the virtual file exactly with user-provided imports
    let fileSource = "";
    for (const importLine of imports) {
        //fileSource += `${importLine}\n`;
        fileSource += rebaseImport(importLine, pugPath, tmpDir) + "\n";
    }
    fileSource += `type ExpectContract = ${rawExpects};\n`;


    // store to .tmp under projectPath
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
        throw new ParseError("ContractParseError: //@expect must describe an object type.");
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
            throw new ParseError(`ContractParseError: Unknown type referenced in @expect: '${typeAtLoc.getText()}'`);
        }

        expects[name] = typeAtLoc.getText();
    }


    // TODO: warn about unused imported types
    // TODO: support shared references/transitive validation

    return { imports, expects, rawExpects};
}



