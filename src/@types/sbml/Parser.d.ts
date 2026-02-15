/**
 * SBML Parser types
 */

import type { SbmlDocument } from "./Model.js";

/**
 * SbmlParserDelegate - JavaScript implementation interface
 * Provide file loading and logging functionality for SBML parsing
 */
export interface SbmlParserDelegate {
  /**
   * Load SBML file content by filename
   * @param parser The parser instance (can be null)
   * @param fileName Name of the file to load
   * @returns SBML file content as string, or null if file not found
   */
  getTextWithContentsOfFileNamed(parser: any, fileName: string): string | null;

  /**
   * Write log message from parser
   * @param logger The logger instance (can be null)
   * @param message Log message text
   * @param level Log level: "trace", "warning", or "error"
   */
  writeLogMessage(logger: any, message: string, level: string): void;
}

/**
 * SbmlParser - Parser for SBML (Simplified Book Markup Language) files
 */
export interface SbmlParser {
  /**
   * Parse multiple SBML files into a document
   * @param fileNames Array of SBML file names to parse
   * @param docProps Document properties as key-value pairs
   * @param envVars Environment variables as key-value pairs
   * @returns Parsed SBML document or null on error
   */
  parseFiles(
    fileNames: string[],
    docProps: Record<string, string>,
    envVars: Record<string, string>
  ): SbmlDocument | null;

  /**
   * Get the SBML version used by this parser
   * @returns SBML version number (e.g., 1.0, 2.0)
   */
  getVersion(): number;

  /**
   * Delete this parser instance and free associated resources
   * Note: While JavaScript GC will eventually clean up, calling delete() explicitly
   * is recommended to free WASM memory immediately
   */
  delete(): void;
}

/**
 * SbmlParser constructor
 */
export interface SbmlParserConstructor {
  new(version: number, delegate: SbmlParserDelegate): SbmlParser;
}
