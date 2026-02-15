/**
 * Selection types for text selection in SBML documents
 */

/**
 * SbmlSelection - Represents a text selection with offset, length, and styling
 */
export interface SbmlSelection {
  offset: number;
  length: number;
  textColor: number;
  highlightColor: number;
  textDecoration: string;
  delete(): void;
}

/**
 * SbmlSelection constructor
 */
export interface SbmlSelectionConstructor {
  new(): SbmlSelection;
}
