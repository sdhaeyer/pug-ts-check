import path from "node:path";
import { Path } from "../utils/utils";

class DependencyGraph {
  /**
   * Stores dependencies:
   * file -> set of files it depends on (its parents/includes)
   */
  public graph = new Map<string, Set<string>>();

  /**
   * Add a dependency: file depends on dependency
   */
  add(file: string, dependency: string) {
    file = Path.normalize(file);
    dependency = Path.normalize(dependency);

    

    if (!this.graph.has(file)) {
      this.graph.set(file, new Set());
    }
    this.graph.get(file)!.add(dependency);
  }

  /**
   * Remove all dependencies of a given file
   */
  clear(file: string) {
    file = Path.normalize(file);
    this.graph.delete(file);
  }

  /**
   * Get the set of dependencies for a file
   */
  get(file: string): Set<string> | undefined {
    file = Path.normalize(file);
    return this.graph.get(file);
  }

  /**
   * Get all files that depend on a given file ///todo haven't checked the code on accuracy
   */
  getDependentsOf(file: string): string[] {
    file = Path.normalize(file);

    const found = new Set<string>();
    const stack = [file];

    while (stack.length > 0) {
        const current = stack.pop()!;
        for (const [f, dependencies] of this.graph.entries()) {
            if (dependencies.has(current) && !found.has(f)) {
                found.add(f);
                stack.push(f);
            }
        }
    }

    // remove the original file itself if present
    found.delete(file);

    return Array.from(found);
  }
}

export const dependencyGraph = new DependencyGraph();