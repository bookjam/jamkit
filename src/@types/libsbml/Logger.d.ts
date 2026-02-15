/**
 * Logging system types
 */

/**
 * LoggerImpl - JavaScript implementation interface
 * Handle log messages from C++ code
 */
export interface LoggerImpl {
  logLine(level: number, message: string): void;
}

/**
 * Logger - Logging wrapper
 */
export interface Logger {
  delete(): void;
}

export interface LoggerConstructor {
  new(impl: LoggerImpl): Logger;
}
