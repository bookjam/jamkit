/**
 * Object helper types
 */

import type { SbmlNode } from "./Model.js";
import type { SbmlFontSpec } from "./Font.js";

/**
 * SbmlObjectHelper - Utility class for creating font specs from nodes and properties
 */
export interface SbmlObjectHelper {
  /**
   * Create SbmlFontSpec from SbmlNode or properties object
   * @param node Optional SBML node with font attributes
   * @param props Optional properties object with font-* properties
   * @returns SbmlFontSpec object
   */
  makeFontSpec(node: SbmlNode | null, props: Record<string, string> | null): SbmlFontSpec;
}

export interface SbmlObjectHelperConstructor {
  makeFontSpec(node: SbmlNode | null, props: Record<string, string> | null): SbmlFontSpec;
}

/**
 * ObjectHelper - Deprecated alias for SbmlObjectHelper (for backward compatibility)
 * @deprecated Use SbmlObjectHelper instead
 */
export type ObjectHelper = SbmlObjectHelper;

/**
 * ObjectHelperConstructor - Deprecated alias for SbmlObjectHelperConstructor
 * @deprecated Use SbmlObjectHelperConstructor instead
 */
export type ObjectHelperConstructor = SbmlObjectHelperConstructor;
