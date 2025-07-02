import path from "node:path";
import { Project } from "ts-morph";
import { config } from "../config/config";

let _cachedProject: Project | null = null;

export function getTsProject(): Project {
    if (!_cachedProject) {
        _cachedProject = new Project({
            tsConfigFilePath: path.join(config.projectPath, "tsconfig.json"),
        });
    }
    return _cachedProject;
}
