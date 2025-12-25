/**
 * Logger utility with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev: boolean;

  constructor() {
    this.isDev = import.meta.env.DEV;
  }

  debug(...args: any[]): void {
    if (this.isDev) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    console.info('[INFO]', ...args);
  }

  warn(...args: any[]): void {
    console.warn('[WARN]', ...args);
  }

  error(...args: any[]): void {
    console.error('[ERROR]', ...args);
  }

  group(label: string): void {
    if (this.isDev) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd();
    }
  }
}

export const logger = new Logger();
