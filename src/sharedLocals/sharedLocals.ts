import type { Config } from "../config/config.js";
import { Path } from "../utils/utils.js";
import fs from "node:fs";
import { Logger } from "../utils/Logger.js";

export function resolveSharedLocals(config: Config): { importline: string, fields: string[] } {
    Logger.debug("resolveSharedLocals called", { config });
    const sharedConfig = config.sharedLocals;

    if (!sharedConfig) {
        Logger.debug("No shared locals configuration found");
        return { importline: "", fields: [] };
    }

    const sharedFilePath = Path.resolve(config.projectPath, sharedConfig.importPath);

    if (!fs.existsSync(sharedFilePath)) {
        let message = `❌ SharedLocals file not found at: ${sharedFilePath}.  \n projectpath: ${config.projectPath} \nimportpath: ${sharedConfig.importPath}`;
        
            message += `\nPlease check your configuration`;
        
        Logger.warn(message);
        return { importline: "", fields: [] };
    }

    try {
        const content = fs.readFileSync(sharedFilePath, 'utf-8');

        // Extract type alias: type SharedLocals = { field1: string; field2: boolean };
        const typeRegex = new RegExp(
            `type\\s+${sharedConfig.typeName}\\s*=\\s*\\{([^}]+)\\}`,
            's'
        );
        const match = content.match(typeRegex);

        if (!match) {
            Logger.warn(`Type ${sharedConfig.typeName} not found in ${sharedFilePath}`);
            return { importline: "", fields: [] };
        }

        // Extract field names from type definition
        const sharedFields = match[1]
            .split(';')
            .map(line => line.trim().split(':')[0].trim())
            .filter(field => field.length > 0);

        const importline = `import type { ${sharedConfig.typeName} } from '${sharedFilePath}';`;

        Logger.debug(`Resolved shared locals: ${sharedFields.join(', ')}`);
        return { importline, fields: sharedFields };
    } catch (error) {
        Logger.warn(`Failed to resolve shared locals: ${error}`);
        return { importline: "", fields: [] };
    }
}