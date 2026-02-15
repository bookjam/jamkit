/**
 * BON Parser types
 */

/**
 * BonValue - Wrapper for C++ sbml::BonValue
 * Represents a BON value that can be a map, array, or string
 */
export interface BonValue {
  /**
   * Check if this value is a map (object)
   */
  isMap(): boolean;

  /**
   * Check if this value is an array
   */
  isArray(): boolean;

  /**
   * Check if this value is a string
   */
  isString(): boolean;

  /**
   * Convert to BonMap if this value is a map
   * @returns BonMap instance, or null if not a map
   */
  toMap(): BonMap | null;

  /**
   * Convert to BonArray if this value is an array
   * @returns BonArray instance, or null if not an array
   */
  toArray(): BonArray | null;

  /**
   * Convert to string if this value is a string
   * @returns String value, or empty string if not a string
   */
  toString(): string;

  /**
   * Convert to JavaScript native object
   * Recursively converts BON structures to plain JS objects/arrays/strings
   * @returns Native JavaScript value (Object/Array/String), or null
   */
  toObject(): any;

  delete(): void;
}

/**
 * BonMap - Wrapper for C++ sbml::BonObject
 * Represents a BON map (key-value object)
 */
export interface BonMap {
  /**
   * Get value for a key
   * @param key The key to look up
   * @returns BonValue instance, or null if key doesn't exist
   */
  get(key: string): BonValue | null;

  /**
   * Get string value for a key
   * @param key The key to look up
   * @returns String value, or null if key doesn't exist or value is not a string
   */
  getStringForKey(key: string): string | null;

  /**
   * Check if a key exists in the map
   * @param key The key to check
   * @returns true if key exists
   */
  hasKey(key: string): boolean;

  /**
   * Get the number of entries in the map
   * @returns Number of key-value pairs
   */
  size(): number;

  /**
   * Get all keys in the map
   * @returns Array of key strings
   */
  keySet(): string[];

  /**
   * Convert to JavaScript native object
   * Recursively converts BON structures to plain JS objects
   * @returns Native JavaScript object, or null
   */
  toObject(): Record<string, any> | null;

  delete(): void;
}

/**
 * BonArray - Wrapper for C++ sbml::BonArray
 * Represents a BON array
 */
export interface BonArray {
  /**
   * Get value at index
   * @param index The index to access
   * @returns BonValue instance, or null if index is out of bounds
   */
  get(index: number): BonValue | null;

  /**
   * Get string value at index
   * @param index The index to access
   * @returns String value, or null if index is out of bounds or value is not a string
   */
  getString(index: number): string | null;

  /**
   * Get the number of elements in the array
   * @returns Number of elements
   */
  size(): number;

  /**
   * Get all string values from the array
   * @returns Array of strings (non-string values are skipped)
   */
  stringValues(): string[];

  /**
   * Convert to JavaScript native array
   * Recursively converts BON structures to plain JS arrays
   * @returns Native JavaScript array, or null
   */
  toObject(): any[] | null;

  delete(): void;
}

/**
 * BonParser - Parser for BON (Bookjam Object Notation) format
 * Static methods for parsing BON text and files
 */
export interface BonParserConstructor {
  /**
   * Parse BON text to BonValue
   * @param text BON text to parse
   * @returns BonValue instance, or null on parse error
   */
  parse(text: string): BonValue | null;

  /**
   * Parse BON file to BonValue
   * @param filename Path to BON file
   * @returns BonValue instance, or null on file read or parse error
   */
  parseFile(filename: string): BonValue | null;
}

/**
 * BonWriter - Writer for BON (Bookjam Object Notation) format
 * Static methods for serializing BonValue to BON text and files
 */
export interface BonWriterConstructor {
  /**
   * Write BonValue to BON formatted string
   * @param value BonValue to serialize
   * @returns BON formatted string
   */
  write(value: BonValue | BonMap | BonArray): string;

  /**
   * Write BonValue to a BON file
   * @param value BonValue to serialize
   * @param filename Path to output file
   * @returns true if writing succeeded, false otherwise
   */
  writeFile(value: BonValue | BonMap | BonArray, filename: string): boolean;
}
