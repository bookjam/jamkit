/**
 * Style types for SBML documents
 */

/**
 * SbmlStyle - A named style with properties
 * Used for styling text and elements in SBML documents
 */
export interface SbmlStyle {
  /**
   * Get the name of this style
   * @returns Style name
   */
  getName(): string;

  /**
   * Get a property value by key
   * @param key Property key
   * @returns Property value or empty string if not found
   */
  getProperty(key: string): string;

  /**
   * Set a property value
   * @param key Property key
   * @param value Property value (empty string removes the property)
   */
  setProperty(key: string, value: string): void;

  /**
   * Remove a property by key
   * @param key Property key to remove
   */
  removeProperty(key: string): void;

  /**
   * Get all properties as a key-value object
   * @returns Object with all properties
   */
  getProperties(): Record<string, string>;
}

/**
 * SbmlStyleConstructor - Constructor interface for SbmlStyle
 */
export interface SbmlStyleConstructor {
  new (): SbmlStyle;
}

/**
 * Style - Deprecated alias for SbmlStyle (for backward compatibility)
 * @deprecated Use SbmlStyle instead
 */
export type Style = SbmlStyle;
