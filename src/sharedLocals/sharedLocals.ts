import { Project } from "ts-morph";
import { config } from "../config/config.js";
import { Path } from "../utils/utils.js";
import fs from "node:fs";
import { getProjectContext } from "../cache/project-context.js";

export function resolveSharedLocals(tsProject: Project): { importline: string, fields: string[] } {
    const ctx = getProjectContext();
    const sharedConfig = config.sharedLocals;

    if (!sharedConfig) {
        throw new Error("Shared locals configuration is not defined in config");
    }
    const sharedFilePath = Path.resolve(config.projectPath, sharedConfig.importPath);

    if (!fs.existsSync(sharedFilePath)) {
        throw new Error(`❌ SharedLocals file not found at: ${sharedFilePath}. Have a look at your configuration ${ctx.pugTsConfigPath} \n projectpath: ${config.projectPath} \nimportpath: ${sharedConfig.importPath}` );
    }

    // Refresh the file if already loaded
    const existing = tsProject.getSourceFile(sharedFilePath);
    if (existing) tsProject.removeSourceFile(existing);

    const sourceFile = tsProject.addSourceFileAtPath(sharedFilePath);

    const sharedType = sourceFile.getTypeAliasOrThrow(sharedConfig.typeName).getType();

    const properties = sharedType.getProperties();
    const sharedFields = properties.map(p => p.getName());  // ['user', 'cart', 'isAdmin']
    const absPath = Path.resolve(config.projectPath, sharedConfig.importPath);

    return { importline: `import type { ${sharedConfig.typeName} } from '${absPath}';`, fields: sharedFields };
}