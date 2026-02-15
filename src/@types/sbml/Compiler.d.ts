/**
 * SBML Compiler types
 */

import type { SbmlParserDelegate } from "./Parser.js";
import type { PropMap, ScreenSpec } from "./Geometry.js";
import type { SbmlBook } from "./Book.js";
import type { SbmlBookCompileConfig, SbmlPageCompileConfig } from "../src/Compiler.js";

/**
 * SbmlCompilerDelegate - JavaScript implementation interface
 * Provide file loading, object size calculation, and logging
 * Extends SbmlParserDelegate for file loading and logging capabilities
 */
export interface SbmlCompilerDelegate extends SbmlParserDelegate {
  /**
   * Get size of an object for layout calculation
   * @param compiler The compiler instance
   * @param bounds The bounds rectangle
   * @param lengthResolver The length resolver
   * @param node The node
   * @param type The object type
   * @param props The property map
   * @returns Object dimensions
   */
  getObjectSize(compiler: any, bounds: any, lengthResolver: any, node: any, type: string, props: any): { width: number; height: number };

  /**
   * Get outline of an object for text wrapping
   * @param compiler The compiler instance
   * @param type The object type
   * @param props The property map
   * @param lefty Whether this is a left page
   * @param outline The outline vector (array of floats)
   * @returns Object dimensions
   */
  getObjectOutline(compiler: any, type: string, props: any, lefty: boolean, outline: any): { width: number; height: number };

  /**
   * Get size of a dynamic object (e.g., video, audio)
   * @param compiler The compiler instance
   * @param objectId The dynamic object ID
   * @returns Object dimensions
   */
  getDynamicObjectSize(compiler: any, objectId: string): { width: number; height: number };
}

/**
 * SbmlCompiler - Main compiler for SBML documents
 */
export interface SbmlCompiler {
  /**
   * Compile a book from SBML configuration
   * @param config Book compilation configuration
   * @returns Compiled Book or null on error
   */
  compileBook(config: SbmlBookCompileConfig): SbmlBook | null;

  /**
   * Compile a page from SBML configuration
   * @param config Page compilation configuration
   * @returns Compiled Page or null on error
   */
  compilePage(config: SbmlPageCompileConfig): any | null;

  /**
   * Compile a section node into a page
   * @param sectionNode The section node to compile
   * @param pageLayout The page layout configuration
   * @returns Compiled Page or null on error
   */
  compileSection(sectionNode: any, pageLayout: any): any | null;

  /**
   * Get the SBML version used by this compiler
   * @returns SBML version number (e.g., 1.0, 2.0)
   */
  getVersion(): number;

  /**
   * Delete this compiler instance and free associated resources
   * Note: While JavaScript GC will eventually clean up, calling delete() explicitly
   * is recommended to free WASM memory immediately
   */
  delete(): void;
}

export interface SbmlCompilerConstructor {
  new(version: number, delegate: SbmlCompilerDelegate, fontFactory: any): SbmlCompiler;
}
