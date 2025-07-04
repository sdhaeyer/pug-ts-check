import path from "node:path";

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
    file = path.posix.normalize(file.replace(/\\/g, "/"))
    dependency = path.posix.normalize(dependency.replace(/\\/g, "/"))

    if (!this.graph.has(file)) {
      this.graph.set(file, new Set());
    }
    this.graph.get(file)!.add(dependency);
  }

  /**
   * Remove all dependencies of a given file
   */
  clear(file: string) {
    file = path.posix.normalize(file.replace(/\\/g, "/"))
    this.graph.delete(file);
  }

  /**
   * Get the set of dependencies for a file
   */
  get(file: string): Set<string> | undefined {
    file = path.posix.normalize(file.replace(/\\/g, "/"))
    return this.graph.get(file);
  }

  /**
   * Get all files that depend on a given file
   */
  getDependentsOf(file: string): string[] {
    file = path.posix.normalize(file.replace(/\\/g, "/"))
    const dependents: string[] = [];
    for (const [f, dependencies] of this.graph.entries()) {
      if (dependencies.has(file)) {
        dependents.push(f);
      }
    }
    return dependents;
  }
}

export const dependencyGraph = new DependencyGraph();