import { Logger } from "../utils/Logger.js";
import { Project } from "ts-morph";
import path from "node:path";
import fs from "node:fs";

import { ParseError } from "../errors/ParseError.js";
import { ParsedContract } from "../types/types.js"; // fix if needed
import { normalizeImportPath, toAbsolute } from "../utils/utils.js";
import { config } from "../config/config.js";


import { dependencyGraph } from "../cache/dependencyGraph.js";
import { Import } from "../utils/import.js";
import { getProjectContext } from "../cache/project-context.js";



/**
 * Parse //@import and //@expect from pug source
 */
export function parseContract(pugPath: string, pugSource?: string): { contract: ParsedContract | undefined, errors: ParseError[] } {
    Logger.debug("Parsing contract annotations in Pug...");


    const contract = new ParsedContract(pugPath);
    const errors: ParseError[] = [];

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

                let importObject
                try {
                    importObject = new Import(ruleText, pugPath, currentLine);
                    contract.imports.push(importObject);
                } catch (e) {
                    errors.push(new ParseError(`ContractParseError: Invalid import line: ${ruleText}`, pugPath, currentLine));
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

        }

        // handle raw pug includes and extends
        if (trimmed.startsWith("include ")) {
            const includePath = trimmed.slice("include ".length).trim();
            contract.rawIncludes.push(includePath);
            contract.includes.push(toAbsolute(includePath, pugPath));
        }

        if (trimmed.startsWith("extends ")) {
            const extendsPath = trimmed.slice("extends ".length).trim();
            contract.rawExtends.push(extendsPath);
            contract.extends.push(toAbsolute(extendsPath, pugPath));
        }
        currentLine++;
    }

    if (!contract.rawExpects) {
        contract.rawExpects = "{}";
        // errors.push(new ParseError("ContractParseError: No //@expect block found; please add one to your Pug file.", pugPath, 0));

    }

    for (const depPath of [...contract.includes, ...contract.extends]) {
        dependencyGraph.add(pugPath, depPath);

    }

    // build the virtual file exactly with user-provided imports
    let fileSource = "";
    for (const importObject of contract.imports) {
        const importPath = normalizeImportPath(importObject.getAbsolutePath());
        if (!fs.existsSync(importPath)) {
            errors.push(new ParseError(`ContractParseError: Import file not found: ${importPath}`, pugPath, importObject.lineNumber));
            continue; // skip this import if file does not exist
        }
        dependencyGraph.add(pugPath, importPath);
        fileSource += importObject.getAbsoluteImportStatement() + "\n";
    }
    fileSource += `type ExpectContract = ${contract.rawExpects};\n`;

     if (false) {
        // setup ts-morph
        
        const ctx = getProjectContext(); // ensure project context is initialized
        const project = ctx.tsProject;
        Logger.debug(`Creating virtual TypeScript file`);
        const virtualFilePath = path.join(tmpDir, "VirtualExpectFile.ts");
        const sourceFile = project.createSourceFile(virtualFilePath, fileSource, { overwrite: true });


        Logger.debug("Get TypeAlias or Throw")
        const typeAlias = sourceFile.getTypeAliasOrThrow("ExpectContract");

        Logger.debug("Get Type from TypeAlias This line takes long");
        const type = typeAlias.getType();

        Logger.debug("Checking if type is an object");
        if (!type.isObject()) {
            if (contract.atExpectLine != -1) {
                errors.push(new ParseError("ContractParseError: //@expect must describe an object type.", pugPath, contract.atExpectLine));
            }
        }


        Logger.debug("Get properties from Type");
        const props = type.getProperties();

        const knownBuiltins = ["string", "number", "boolean", "Date", "Record", "Array", "any", "unknown", "object", "null", "undefined", "never"]

   

        Logger.debug("Parsing properties from @expect...");
        for (const prop of props) {
            const name = prop.getName();
            const declarations = prop.getDeclarations();
            const typeNode = declarations[0];
            const typeAtLoc = prop.getTypeAtLocation(typeNode);
            const typeParts = typeAtLoc.getText().split("|").map(p => p.trim());
            for (const typeName of typeParts) {
                Logger.debug(`Checking type: ${typeName} for property: ${name}`);
                if (knownBuiltins.includes(typeName)) {
                    continue; // ok
                }
                const sym = typeAtLoc.getSymbol();
                if (!sym) {
                    // Logger.debug(`No symbol found for type: ${typeName} in property: ${name}`);
                    errors.push(new ParseError(`Unknown type referenced in @expect: '${typeName}'`, pugPath, contract.atExpectLine));

                } else {
                    // Logger.debug(`Symbol found for type: ${typeName} in property: ${name}`);
                    // Logger.debug(sym);
                }
            }

            // Logger.debug(`xxxxxxxx Adding property to virtualExpects: ${name} with type: ${typeAtLoc.getText()}`);
            // contract.virtualExpects[name] = typeAtLoc.getText();
        }
    }


    // TODO: warn about unused imported types
    // TODO: support shared references/transitive validation

    Logger.debug("Parsed contract annotations successfully.");
    return { contract, errors };
}



