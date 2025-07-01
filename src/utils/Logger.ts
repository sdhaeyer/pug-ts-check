const enabledLevels = (process.env.LOG_LEVEL || "info").split(",");

function shouldLog(level: string) {
  return enabledLevels.includes(level) || enabledLevels.includes("all");
}

function formatArgs(args: any[]) {
  const foundMulti = args.some(a => typeof a === "string" && a.includes("\n"));
  if (foundMulti) {
    return ["[MULTILINE]\n", ...args];
  }
  return args;
}

export const Logger = {
  info(...args: any[]) {
    if (shouldLog("info")) {
      console.log(`\x1b[36m[INFO]\x1b[0m `, ...formatArgs(args)); // cyan
    }
  },
  warn(...args: any[]) {
    if (shouldLog("warn")) {
      console.warn(`\x1b[33m[WARN]\x1b[0m `, ...formatArgs(args)); // yellow
    }
  },
  error(...args: any[]) {
    console.error(`\x1b[31m[ERROR]\x1b[0m `, ...formatArgs(args)); // red
  },
  debug(...args: any[]) {
    if (shouldLog("debug")) {
      console.log(`\x1b[35m[DEBUG]\x1b[0m `, ...formatArgs(args)); // magenta
    }
  }
};
