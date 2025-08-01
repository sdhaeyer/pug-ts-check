import fs from "fs";

import { parseExpects, Path } from "../utils/utils.js";
import { parsedResultStore } from "../cache/parsedResult.js";
import { config } from "../config/config.js";
import { Logger } from "../utils/Logger.js";


export function generateViewLocals() {

    const outDir = Path.resolve(config.projectPath, config.typesPath);
    const outputPath = Path.resolve(outDir, "viewlocals.d.ts");
    const store = parsedResultStore;

    const importMap = new Map<string, Set<string>>();

    const interfaceLines: string[] = [];
    const viewMapLines: string[] = [];

    for (const [, parsed] of store.getAll()) {
        const contract = parsed.contract;
        if (!contract) continue;

        const viewName = normalizeViewName(contract.pugPath);
        const interfaceName = viewNameToInterfaceName(viewName);

        // Collect import statements
        // this is source string and set off symbols string


        for (const imp of contract.imports) {
            const { symbols, source } = { symbols: imp.importSymbols, source: imp.getRebasedPath(outDir) };

            if (!importMap.has(source)) {
                importMap.set(source, new Set());
            }
            const symbolSet = importMap.get(source)!;
            for (const sym of symbols) {
                symbolSet.add(sym);
            }
        }

        let expects;
        try {
            // Parse @expect block into key:type pairs
            expects = parseExpects(contract.rawExpects);
        } catch (error) {

            if (error instanceof Error) {
                Logger.error(`Failed to parse @expect block in ${contract.pugPath}: ${error.message}`);
            } else {
                Logger.error(`Failed to parse @expect block in ${contract.pugPath}: ${String(error)}`);
            }
            continue;

        }

        // Generate interface block
        const fields = Object.entries(expects)
            .map(([k, t]) => `${k}: ${t};`)
            .sort()
            .join(" ");

        interfaceLines.push(`interface ${interfaceName} {${fields}}`);
        viewMapLines.push(`  "${viewName}": ${interfaceName},`);
    }

    const importSet = new Set<string>();
    const sortedImportMap = new Map(
        [...importMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    );
    // Assemble output
    for (const [source, symbols] of sortedImportMap) {
        const importStatement = `import type { ${Array.from(symbols).sort().join(", ")} } from "${source}"`;
        importSet.add(importStatement);
    }
    const importBlock = Array.from(importSet).join("\n");
    const interfacesBlock = interfaceLines.sort().join("\n");
    const viewMapBlock = `export type ViewLocals = {\n${viewMapLines.sort().join("\n")}\n};`;

    const finalOutput = [importBlock, "", interfacesBlock, "", viewMapBlock, ""].join("\n");


    // Ensure output directory exists

    if (!fs.existsSync(outDir)) {
        throw new Error(`Output directory for types does not exist: ${outDir}. Please create it.`);
    }


    // Write only if changed
    const previous = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
    if (previous !== finalOutput) {
        fs.writeFileSync(outputPath, finalOutput);
        Logger.debug(`🟢 viewlocals.d.ts written to \n"${outputPath}"`);
    } else {
        Logger.debug(`🟡 viewlocals.d.ts unchanged at \n"${outputPath}"`);
    }
}

function normalizeViewName(pugPath: string): string {
    const viewsRootAbs = Path.resolve(config.projectPath, config.viewsRoot);
    const relative = Path.relative(viewsRootAbs, pugPath);
    return relative.replace(/\.pug$/, "");
}

function viewNameToInterfaceName(viewName: string): string {
    return sanitizeInterfaceName(viewName.split("/").map(capitalize).join("_"));
}

function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function sanitizeInterfaceName(viewPath: string): string {
    return viewPath
        .replace(/[^a-zA-Z0-9]/g, "_") // replace -, / etc.
        .replace(/^(\d)/, "_$1")       // prefix if starts with number
        .replace(/^\W+/, "")           // remove leading non-word characters
    //.replace(/([a-z])([A-Z])/g, "$1_$2"); // separate camelCase if needed
}

