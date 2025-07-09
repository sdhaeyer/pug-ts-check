// src/types/ProjectContext.ts
import type { Project } from "ts-morph";

export type ProjectContext = {
  tsProject: Project;
  sharedLocalsMeta: {
    importline: string;
    fields: string[];
  };
};