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

// ============================================================================
// Layout and Animation Options
// ============================================================================

/**
 * Layout and animation options
 */
export interface LayoutOptions {
  /** Add object as child */
  "add-as-child"?: "yes" | "no";
  /** Send to back in z-order */
  "send-to-back"?: "yes" | "no";
  /** Bring to front in z-order */
  "bring-to-front"?: "yes" | "no";
  /** Animation duration in milliseconds */
  "duration"?: string;
  /** Animation curve (linear, ease-in, ease-out, ease-in-out) */
  "curve"?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  /** Delay before animation starts */
  "delay"?: string;
}
