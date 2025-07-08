

function formatArgs(args: any[]) {
  const foundMulti = args.some(
    (a) => typeof a === "string" && a.includes("\n")
  );
  return foundMulti ? ["[MULTILINE]\n", ...args] : args;
}

type LogLevel = "silent" | "error" | "warn" | "init" | "info" | "debug" | "extraInfo";

const LOG_PRIORITIES: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  init: 3,
  info: 4,
  extraInfo: 5,
  debug: 6,
};

class LoggerClass {
  level: LogLevel = "info";

  setLevel(level: LogLevel) {
    this.level = level;
  }

  shouldLog(level: LogLevel) {
    return LOG_PRIORITIES[this.level] >= LOG_PRIORITIES[level];
  }

  log(level: LogLevel, colorCode: string, label: string, ...args: any[]) {
    if (level !== "error" && !this.shouldLog(level)) return;
    console.log(`${colorCode}[${label}]\x1b[0m`, ...formatArgs(args));
  }

  info(...args: any[]) { this.log("info", "\x1b[36m", "INFO", ...args); }
  extraInfo(...args: any[]) { this.log("extraInfo", "\x1b[36m", "EXTRA", ...args); }
  init(...args: any[]) { this.log("init", "\x1b[33m", "INIT", ...args); }
  warn(...args: any[]) { this.log("warn", "\x1b[33m", "WARN", ...args); }
  error(...args: any[]) { console.error(`\x1b[31m[ERROR]\x1b[0m`, ...formatArgs(args)); }
  debug(...args: any[]) { this.log("debug", "\x1b[35m", "DEBUG", ...args); }
}

export const Logger = new LoggerClass();