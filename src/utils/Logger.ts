

function formatArgs(args: any[]) {
  const foundMulti = args.some(
    (a) => typeof a === "string" && a.includes("\n")
  );
  return foundMulti ? ["[MULTILINE]\n", ...args] : args;
}

export type LogLevel = "silent" | "error" | "warn" | "init" | "info" | "debug" | "extraInfo";

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

  private log(level: LogLevel, colorCode: string, label: string, ...args: any[]) {
    if (!this.shouldLog(level)) return;
    if(level === "error"){
      console.error(`${colorCode}[${label}]\x1b[0m`, ...formatArgs(args));
      return;
    }else{
      console.log(`${colorCode}[${label}]\x1b[0m`, ...formatArgs(args));
    }
    
  }

  logLevel(level: LogLevel, ...args: any[]) {
    let colorCode:number = 37; // Default to white
    let label:string = level.toUpperCase();
    if(level === "info") {
        colorCode = 36; // Cyan
        label = "INFO";
    } else if (level === "extraInfo") {
        colorCode = 36; // Cyan
        label = "EXTRA INFO";
    } else if (level === "debug") {
        colorCode = 35; // Magenta
        label = "DEBUG";
    } else if (level === "warn") {
        colorCode = 33; // Yellow
        label = "WARN";
    } else if (level === "error") {
       colorCode = 31; // Red
       label = "ERROR";
    } else if (level === "init") {
       colorCode = 33; // Yellow
       label = "INIT";
    }
    this.log(level, `\x1b[${colorCode}m`, label, ...args);
  }
  info(...args: any[]) { this.logLevel("info", ...args); }
  extraInfo(...args: any[]) { this.logLevel("extraInfo", ...args); }
  init(...args: any[]) { this.logLevel("init", ...args); }
  warn(...args: any[]) { this.logLevel("warn", ...args); }
  error(...args: any[]) { this.logLevel("error", ...args); }
  debug(...args: any[]) { this.logLevel("debug", ...args); }
}

export const Logger = new LoggerClass();