type LogLevel = "silent" | "info" | "debug" | "warn" | "init";

function formatArgs(args: any[]) {
  const foundMulti = args.some(
    (a) => typeof a === "string" && a.includes("\n")
  );
  return foundMulti ? ["[MULTILINE]\n", ...args] : args;
}

class LoggerClass {
  level: LogLevel = "info";

  setLevel(level: LogLevel) {
    this.level = level;
  }

  shouldLog(level: LogLevel) {
    if (this.level === "silent") return false;
    if (level === "debug" && this.level !== "debug") return false;
    return true;
  }

  info(...args: any[]) {
    if (this.shouldLog("info")) {
      console.log(`\x1b[36m[INFO]\x1b[0m`, ...formatArgs(args));
    }
  }
  init(...args: any[]) {
    if (this.shouldLog("init")) {
      console.log(`\x1b[33m[INIT]\x1b[0m`, ...formatArgs(args));
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog("warn")) {
      console.warn(`\x1b[33m[WARN]\x1b[0m`, ...formatArgs(args));
    }
  }

  error(...args: any[]) {
    console.error(`\x1b[31m[ERROR]\x1b[0m`, ...formatArgs(args));
  }

  debug(...args: any[]) {
    if (this.shouldLog("debug")) {
      console.log(`\x1b[35m[DEBUG]\x1b[0m`, ...formatArgs(args));
    }
  }
  
}

export const Logger = new LoggerClass();