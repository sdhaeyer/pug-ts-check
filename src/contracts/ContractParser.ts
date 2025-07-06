import { Logger } from "../utils/Logger.js";
import { Project } from "ts-morph";
import path from "node:path";
import fs from "node:fs";

import { ParseError } from "../errors/ParseError.js";
import { ParsedContract } from "../types/types.js"; // fix if needed
import { absoluteImport, normalizeImportPath, rebaseImport } from "../utils/utils.js";
import { config } from "../config/config.js";

import { getTsProject } from "../validate/projectCache.js";
import { extractImportPath } from "../utils/utils.js";
import { dependencyGraph } from "../cache/dependencyGraph.js";


/**
 * Parse //@import and //@expect from pug source
 */
export function parseContract(pugPath: string, pugSource?: string): { contract: ParsedContract | undefined, errors: ParseError[] } {
    Logger.debug("Parsing contract annotations in Pug...");


    const contract = new ParsedContract(pugPath);


    var errors: ParseError[] = [];

    const tmpDir = path.join(config.projectPath, config.tmpDir);



    if (!pugSource) {

        if (!fs.existsSync(pugPath)) {
            errors.push(new ParseError(`ContractParseError: Pug file not found`, pugPath, 1));
            return { contract: undefined, errors };



        }
        pugSource = fs.readFileSync(pugPath, "utf8");
    }



    const lines = pugSource.split("\n");
    let currentLine = 1;




    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("//@")) {
            const ruleText = trimmed.slice(3).trim(); // remove '//@'

            if (ruleText.startsWith("import")) {
                if (!ruleText.startsWith("import type")) {

                    Logger.warn(`⚠️  Consider using 'import type' to avoid runtime imports in contracts: ${ruleText}`);
                    Logger.warn(` Found in ${pugPath}:${currentLine} on line ${currentLine}`);
                }
                contract.rawImports.push(ruleText);
                const rebased = rebaseImport(ruleText, pugPath);
                if (!rebased) {
                    errors.push(new ParseError(`ContractParseError: Import rebasing failed for ${ruleText}`, pugPath, currentLine));
                } else {
                    contract.rebasedImports.push(rebased);

                }

                const absolute = absoluteImport(ruleText, pugPath);
                if (!absolute) {
                    errors.push(new ParseError(`ContractParseError: Import absolute path failed for ${ruleText}`, pugPath, currentLine));
                } else {
                    contract.absoluteImports.push(absolute);
                }
            }

            if (ruleText.startsWith("expect")) {
                if (!!contract.rawExpects) {
                    errors.push(new ParseError("ContractParseError: Multiple //@expect blocks found; only one allowed.", pugPath, currentLine));
                }
                const expectMatch = ruleText.match(/expect\s+(.*)/);
                if (expectMatch) {
                    contract.rawExpects = expectMatch[1].trim();
                    contract.atExpectLine = currentLine;
                }
            }

            // handle raw pug includes and extends
            if (trimmed.startsWith("include ")) {
                const includePath = trimmed.slice("include ".length).trim();
                contract.rawIncludes.push(includePath);
            }

            if (trimmed.startsWith("extends ")) {
                const extendsPath = trimmed.slice("extends ".length).trim();
                contract.rawExtends.push(extendsPath);
            }
        }
        currentLine++;
    }

    if (!contract.rawExpects) {
        errors.push(new ParseError("ContractParseError: No //@expect block found; please add one to your Pug file.", pugPath, 0));

    }




    // build the virtual file exactly with user-provided imports
    let fileSource = "";
    for (const importLine of contract.absoluteImports) {
        const importPath = normalizeImportPath(extractImportPath(importLine));
        if (!fs.existsSync(importPath)) {
            errors.push(new ParseError(`ContractParseError: Import file not found: ${importPath}`, pugPath, contract.atExpectLine));
            continue; // skip this import if file does not exist
        }
        dependencyGraph.add(pugPath, importPath);
        fileSource += importLine + "\n";
    }
    fileSource += `type ExpectContract = ${contract.rawExpects};\n`;


    // store to .tmp under projectPath
    Logger.debug("Creating temporary directory for virtual file...");
    Logger.debug(`Temporary directory: ${tmpDir}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const tmpPath = path.join(tmpDir, "VirtualExpectFile.ts");
    Logger.debug(`Temporary file path: ${tmpPath}`);
    fs.writeFileSync(tmpPath, fileSource, "utf8");


    // setup ts-morph
    const project = getTsProject();



    const sourceFile = project.addSourceFileAtPath(tmpPath);
    sourceFile.refreshFromFileSystemSync();

    const typeAlias = sourceFile.getTypeAliasOrThrow("ExpectContract");

    const type = typeAlias.getType();
    if (!type.isObject()) {
        if (atExpectLine != -1) {
            errors.push(new ParseError("ContractParseError: //@expect must describe an object type.", pugPath, atExpectLine));
        }
    }


    const props = type.getProperties();



    const virtualExpects: Record<string, string> = {};

    for (const prop of props) {
        const name = prop.getName();
        const declarations = prop.getDeclarations();
        const typeNode = declarations[0];
        const typeAtLoc = prop.getTypeAtLocation(typeNode);

        const symbol = typeAtLoc.getSymbol();
        if (!symbol) {
            errors.push(new ParseError(`ContractParseError: Unknown type referenced in @expect: '${typeAtLoc.getText()}'`, pugPath, atExpectLine));

        }

        virtualExpects[name] = typeAtLoc.getText();
    }


    // TODO: warn about unused imported types
    // TODO: support shared references/transitive validation

    Logger.debug("Parsed contract annotations successfully.");
    return { contract: { rebasedImports, virtualExpects, rawImports, rawExpects, absoluteImports, atExpectLine, pugPath }, errors };
}



