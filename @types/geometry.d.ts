/**
 * Jamkit Geometry Type Definitions
 *
 * This file provides TypeScript type definitions for common geometry types
 * used across Jamkit's JavaScript interfaces.
 */

// ============================================================================
// Geometry Types
// ============================================================================

/**
 * Rectangle geometry
 */
export interface Rect {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
}

/**
 * Point geometry
 */
export interface Point {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
}

/**
 * Size geometry
 */
export interface Size {
  /** Width */
  width: number;
  /** Height */
  height: number;
}
