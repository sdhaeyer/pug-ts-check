import path from "node:path";
import { Project } from "ts-morph";
import { config } from "../config/config";
import { Logger } from "../utils/Logger";

let _cachedProject: Project | null = null;

export function getTsProject(): Project {
    if (!_cachedProject) {
        const tsConfigFilePath = path.join(config.projectPath, "tsconfig.json");


        Logger.info("Creating new TypeScript project instance... Only doing this once... might take some time");
        Logger.debug(`Using tsconfig at: ${tsConfigFilePath}`);

        _cachedProject = new Project({
            tsConfigFilePath
        });

        // verify that tmpPath is within rootDir
        const tmpPath = path.resolve(process.cwd(),config.projectPath, config.tmpDir);

        const rootDir = path.resolve( _cachedProject.getCompilerOptions().rootDir?? "");
        if (rootDir && !tmpPath.startsWith(rootDir)) {

            Logger.warn(`⚠️  Temporary file path is outside of configured rootDir: 
                                tmpPath: ${tmpPath} 
                                rootDir: ${rootDir} 
                                This will likely cause TS6059 errors. Please move your .tmp under rootDir.`);
        }
        Logger.info("Creating done.");
    }
    return _cachedProject;
}
