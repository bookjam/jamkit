/**
 * Book and document structure types
 */

import type { Rect } from "./Geometry.js";
import type { SbmlDocument, SbmlSectionNode } from "./Model.js";
import type { SbmlPageDirection, SbmlBookLayout } from "./BookLayout.js";
export type { SbmlBookLayout } from "./BookLayout.js";

/**
 * SbmlBook - Compiled SBML book containing multiple pages
 * Created by SbmlCompiler, not directly instantiated
 */
export interface SbmlBook {
  /**
   * Get the document associated with this book
   * @returns The SBML document
   */
  getDocument(): SbmlDocument;

  /**
   * Get the layout configuration for this book
   * @returns Book layout containing dimensions, margins, gutters, and page direction
   */
  getLayout(): SbmlBookLayout;

  /**
   * Get the total volume (character count) of the book
   * @returns Total character count
   */
  getVolume(): number;

  /**
   * Get the total number of pages in this book
   * @returns Total page count
   */
  getPageCount(): number;

  /**
   * Get a specific page by its index
   * @param index Zero-based page index
   * @returns Page at the specified index, or null if index is out of bounds
   */
  getPageAtIndex(index: number): SbmlPage;

  /**
   * Check if this book uses two-sided (facing pages) layout
   * @returns true if book is two-sided, false otherwise
   */
  isTwoSided(): boolean;

  /**
   * Get the page index for a given location in the document
   * @param location Document location (character offset)
   * @returns Page index containing the location, or -1 if not found
   */
  getPageIndexForLocation(location: number): number;

  /**
   * Get the document location (character offset) for the start of a page
   * @param pageIndex Zero-based page index
   * @returns Document location at the start of the page
   */
  getLocationOfPageAtIndex(pageIndex: number): number;

  /**
   * Get text at a specific location in the book
   * @param location Starting character offset
   * @param length Number of characters to retrieve
   * @returns Text at the specified location
   */
  getTextAtLocation(location: number, length: number): string;

  /**
   * Search for text in the book starting from a given offset
   * @param text Text string to search for
   * @param offset Starting location (character offset) for the search
   * @returns Location of the found text, or -1 if not found
   */
  searchText(text: string, offset: number): number;

  /**
   * Get table of contents sections
   * @returns Array of TOC section nodes
   */
  getTocSections(): SbmlSectionNode[];

  /**
   * Get episode sections
   * @returns Array of episode section nodes
   */
  getEpisodeSections(): SbmlSectionNode[];

  /**
   * Get reading track sections
   * @returns Array of reading track section nodes
   */
  getReadingTrackSections(): SbmlSectionNode[];

  /**
   * Get audio track sections
   * @returns Array of audio track section nodes
   */
  getAudioTrackSections(): SbmlSectionNode[];

  /**
   * Get exam sections
   * @returns Array of exam section nodes
   */
  getExamSections(): SbmlSectionNode[];

  /**
   * Get page background context for a specific page
   * @param index Page index
   * @returns Background context or null
   */
  getPageBackgroundContext(index: number): SbmlPageBackgroundContext | null;

  /**
   * Delete this book instance and free associated resources
   * Note: While JavaScript GC will eventually clean up, calling delete() explicitly
   * is recommended to free WASM memory immediately
   */
  delete(): void;
}

/**
 * SbmlPageBackgroundContext - Page background information
 */
export interface SbmlPageBackgroundContext {
  color: number;
  imageName: string | null;
  imageType: string;
}

/**
 * SbmlPage - Single page in a book containing boxes
 * Returned by SbmlBook.getPageAtIndex()
 */
export interface SbmlPage {
  /**
   * Get the document associated with this page
   * @returns The SBML document that this page belongs to
   */
  getDocument(): SbmlDocument;

  /**
   * Get the layout information for this page
   * @returns Page layout object containing width, height, and margin information
   */
  getLayout(): any;

  /**
   * Get the total number of boxes (layout elements) on this page
   * @returns Total box count
   */
  getBoxCount(): number;

  /**
   * Get a specific box by its index
   * @param index Zero-based box index
   * @returns Box at the specified index, or null if index is out of bounds
   */
  getBoxAt(index: number): SbmlBox | null;

  /**
   * Get background context for this page
   * @returns Background context with color, imageName, and imageType
   */
  getBackgroundContext(): SbmlPageBackgroundContext | null;

  /**
   * Get text at a specific index on this page
   * @param index Index position
   * @returns Text at the specified index
   */
  getTextAtIndex(index: number): string;

  /**
   * Get text rectangles for a range of text
   * @param location Starting location (character offset)
   * @param length Number of characters
   * @returns Array of text rectangles
   */
  getTextRects(location: number, length: number): SbmlTextRect[];

  /**
   * Get all objects on this page
   * @returns Array of object boxes
   */
  getObjects(): SbmlObjectBox[];

  /**
   * Get a property value for this page
   * @param key Property key
   * @param method Query method (0 for direct, 1 for inherited)
   * @returns Property value or null
   */
  getProperty(key: string, method: number): string | null;

  /**
   * Get section for a property
   * @param key Property key
   * @param method Query method
   * @returns Section node or null
   */
  getSectionForProperty(key: string, method: number): SbmlSectionNode | null;

  /**
   * Get word rectangles at a location
   * @param location Character location
   * @returns Array of rectangles for the word at the location
   */
  getWordRects(location: number): SbmlTextRect[];

  /**
   * Check if this page contains a specific location
   * @param location Character location
   * @returns true if the page contains the location
   */
  containsLocation(location: number): boolean;

  /**
   * Check if this page intersects with a text range
   * @param location Starting location
   * @param length Length of the range
   * @returns true if the page intersects with the range
   */
  intersectsWithRange(location: number, length: number): boolean;

  /**
   * Query location for a point on the page
   * @param x X coordinate
   * @param y Y coordinate
   * @param tolerance Touch tolerance
   * @returns Character location at the point, or -1 if not found
   */
  queryLocationForPoint(x: number, y: number, tolerance: number): number;

  /**
   * Query style property at a point
   * @param key Property key to query
   * @param x X coordinate
   * @param y Y coordinate
   * @param tolerance Touch tolerance
   * @returns Style value or null
   */
  queryStyleForProperty(key: string, x: number, y: number, tolerance: number): string | null;

  /**
   * Get the fit width for this page
   * @returns Fit width value
   */
  getFitWidth(): number;

  /**
   * Get the fit height for this page
   * @returns Fit height value
   */
  getFitHeight(): number;
}

/**
 * SbmlBox - Layout box (section, text, object, or dummy)
 * Returned by SbmlPage.getBoxAt()
 */
export interface SbmlBox {
  /**
   * Get the rectangle bounds of this box
   * @returns Rectangle with left, top, right, bottom
   */
  rect(): Rect;
}

/**
 * SbmlObjectBox - Box containing an embedded object
 */
export interface SbmlObjectBox extends SbmlBox {
  /**
   * Get the disposition type of this object box
   * @returns "inline" for inline objects, "block" for block objects
   */
  disposition(): string;

  /**
   * Get a property value by name
   * @param name Property name
   * @returns Property value or empty string if not found
   */
  getProperty(name: string): string;

  /**
   * Get all properties as a key-value object
   * @returns Object with all properties
   */
  getAllProperties(): Record<string, string>;

  /**
   * Get the node pointer for this object box
   * @returns Node pointer as number
   */
  getNode(): number;
}

/**
 * SbmlTextBox - Box containing text content
 * Returned by SbmlPage.getBoxAt() for text layout boxes
 */
export interface SbmlTextBox extends SbmlBox {
  /**
   * Get the text content of this box
   * @returns Text string
   */
  getText(): string;

  /**
   * Get the text range (offset and length) for this box
   * @returns Object with offset and length properties
   */
  getTextRange(): { offset: number; length: number };

  /**
   * Check if this text box uses vertical writing mode
   * @returns true if vertical, false if horizontal
   */
  isVertical(): boolean;
}

/**
 * SbmlSectionBox - Box containing a section marker
 * Returned by SbmlPage.getBoxAt() for section boxes
 */
export interface SbmlSectionBox extends SbmlBox {
  /**
   * Get the section node pointer
   * @returns Section node pointer as number
   */
  getSection(): number;

  /**
   * Get the section ID
   * @returns Section ID string
   */
  getSectionId(): string;
}

/**
 * SbmlTextRect - Rectangle with text range information
 * Returned by SbmlPage.getTextRects()
 */
export interface SbmlTextRect {
  /**
   * Left coordinate
   */
  left: number;

  /**
   * Top coordinate
   */
  top: number;

  /**
   * Right coordinate
   */
  right: number;

  /**
   * Bottom coordinate
   */
  bottom: number;

  /**
   * Text offset (character position)
   */
  offset: number;

  /**
   * Text length (number of characters)
   */
  length: number;

  /**
   * Whether this rect uses vertical writing mode
   */
  isVertical: boolean;
}

/**
 * SbmlBook - Book constructor and utilities
 */
export interface SbmlBookConstructor {
  Layout: {
    new(): SbmlBookLayout;
  };
  _setupNestedClasses(): void;
}
