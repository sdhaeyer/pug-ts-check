

function formatArgs(args: any[]) {
  const foundMulti = args.some(
    (a) => typeof a === "string" && a.includes("\n")
  );
  return foundMulti ? ["[MULTILINE-START]\n", ...args, "[MULTILINE-END]\n"] : args;
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


import type { OutputChannel } from 'vscode';

class LoggerClass {
  level: LogLevel = "info";
  private outputChannel: OutputChannel | null = null;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  setOutputChannel(channel: OutputChannel) {
    this.outputChannel = channel;
    this.logLevel("info", "Logger output channel set");
  }

  shouldLog(level: LogLevel) {
    return LOG_PRIORITIES[this.level] >= LOG_PRIORITIES[level];
  }

  log(level: LogLevel, colorCode: number, label: string, ...args: any[]) {
    if (!this.shouldLog(level)) return;
    const msg = `[${label}] ${formatArgs(args).join(' ')}`;
    if (this.outputChannel) {
      this.outputChannel.appendLine("[PUG-TS-CHECK] " + msg);
    } else if (level === "error") {
      console.error(`\x1b[${colorCode}m[${label}]\x1b[0m`, ...formatArgs(args));
    } else {
      console.log(`\x1b[${colorCode}m[${label}]\x1b[0m`, ...formatArgs(args));
    }
  }

  logLevel(level: LogLevel, ...args: any[]) {
    let colorCode: number = 37; // Default to white
    let label: string = level.toUpperCase();
    if (level === "info") {
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
    this.log(level, colorCode, label, ...args);
  }
  info(...args: any[]) { this.logLevel("info", ...args); }
  extraInfo(...args: any[]) { this.logLevel("extraInfo", ...args); }
  init(...args: any[]) { this.logLevel("init", ...args); }
  warn(...args: any[]) { this.logLevel("warn", ...args); }
  error(...args: any[]) { this.logLevel("error", ...args); }
  debug(...args: any[]) { this.logLevel("debug", ...args); }
}

export const Logger = new LoggerClass();
export const setLogLevel = (level: LogLevel) => Logger.setLevel(level);