import fs from "fs";

import { parseExpects, Path } from "../utils/utils";
import { parsedResultStore } from "../cache/parsedResult";
import { config } from "../config/config";
import { Logger } from "../utils/Logger";


export function generateViewLocals() {

    const outDir = Path.resolve(config.projectPath, config.typesPath);
    const outputPath = Path.resolve(outDir, "viewlocals.d.ts");
    const store = parsedResultStore;

    const importMap = new Map<string, Set<string>>();
    const importSet = new Set<string>();
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

        // Parse @expect block into key:type pairs
        const expects = parseExpects(contract.rawExpects);

        // Generate interface block
        const fields = Object.entries(expects)
            .map(([k, t]) => `${k}: ${t};`)
            .join(" ");

        interfaceLines.push(`interface ${interfaceName} {${fields}}\n`);
        viewMapLines.push(`  "${viewName}": ${interfaceName},`);
    }

    // Assemble output
    for (const [source, symbols] of importMap) {
        const importStatement = `import type { ${Array.from(symbols).sort().join(", ")} } from "${source}"`;
        importSet.add(importStatement);
    }
    const importBlock = Array.from(importSet).join("\n");
    const interfacesBlock = interfaceLines.join("\n");
    const viewMapBlock = `export type ViewLocals = {\n${viewMapLines.join("\n")}\n};`;

    const finalOutput = [importBlock, "", interfacesBlock, "", viewMapBlock, ""].join("\n");


    // Ensure output directory exists

    if (!fs.existsSync(outDir)) {
        throw new Error(`Output directory for types does not exist: ${outDir}. Please create it.`);
    }


    // Write only if changed
    const previous = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
    if (previous !== finalOutput) {
        fs.writeFileSync(outputPath, finalOutput);
        Logger.info(`🟢 viewlocals.d.ts written to \n"${outputPath}"`);
    } else {
        Logger.info(`🟡 viewlocals.d.ts unchanged at \n"${outputPath}"`);
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

