/**
 * Jamkit View JavaScript API Type Definitions
 *
 * This file provides TypeScript type definitions for Jamkit's view
 * JavaScript interface and common view methods.
 */

import type { ObjectBridge } from "./object";
import type { Rect, Point, Size, LayoutOptions } from "./geometry";
import type { DisplayUnit, Environment } from "./data";

// ============================================================================
// View Bridge Interface
// ============================================================================

/**
 * Main view interface available in JavaScript context
 */
interface ViewBridge {
  // ========================================
  // Action Methods
  // ========================================

  /**
   * Fires an action on the view
   * @param action - Action identifier to perform
   * @param params - Action parameters
   */
  action(action: string, params?: Record<string, any>): void;

  /**
   * Sets multiple properties on the view
   * @param props - Properties to set
   */
  property(props: Record<string, any>): void;

  // ========================================
  // Object Access Methods
  // ========================================

  /**
   * Returns a bridge to a specific object within the view
   * @param identifier - Object ID
   * @returns Object bridge
   */
  object(identifier: string): ObjectBridge;

  /**
   * Returns an array of object bridges for a group
   * @param identifier - Group identifier
   * @returns Array of object bridges
   */
  group(identifier: string): ObjectBridge[];

  /**
   * Returns a bridge to a child view
   * @param identifier - Sub-view identifier
   * @returns View bridge
   */
  view(identifier: string): ViewBridge;

  // ========================================
  // Data Methods
  // ========================================

  /**
   * Gets display unit data from the view
   * @param key - "display-unit"
   * @returns Display unit data
   */
  data(key: "display-unit"): DisplayUnit;

  /**
   * Gets environment data from the view
   * @param key - "environment"
   * @returns Environment data
   */
  data(key: "environment"): Environment;

  /**
   * Gets custom data from the view
   * @param key - Data key
   * @returns Data value
   */
  data(key: string): any;

  /**
   * Sets display unit data on the view
   * @param key - "display-unit"
   * @param value - Display unit data or empty object to reset
   */
  data(key: "display-unit", value: DisplayUnit | {}): void;

  /**
   * Sets environment data on the view
   * @param key - "environment"
   * @param value - Environment data
   */
  data(key: "environment", value: Environment): void;

  /**
   * Sets custom data on the view
   * @param key - Data key
   * @param value - Value to set
   */
  data(key: string, value: any): void;

  /**
   * Retrieves all form data from a view
   * @param identifier - Form or view identifier
   * @returns Form data object
   */
  form(identifier: string): Record<string, any>;

  /**
   * Retrieves specific form field value
   * @param identifier - Form or view identifier
   * @param key - Field key
   * @returns Field value
   */
  form(identifier: string, key: string): any;

  // ========================================
  // Geometry Methods
  // ========================================

  /**
   * Asynchronously retrieves frame geometry
   * @param identifier - Object identifier (null for view itself)
   * @param type - "frame"
   * @param handler - Callback receiving frame rectangle
   */
  geometry(identifier: string | null, type: "frame", handler: (value: Rect) => void): void;

  /**
   * Asynchronously retrieves bounds geometry
   * @param identifier - Object identifier (null for view itself)
   * @param type - "bounds"
   * @param handler - Callback receiving bounds rectangle
   */
  geometry(identifier: string | null, type: "bounds", handler: (value: Rect) => void): void;

  /**
   * Asynchronously retrieves center point
   * @param identifier - Object identifier (null for view itself)
   * @param type - "center"
   * @param handler - Callback receiving center point
   */
  geometry(identifier: string | null, type: "center", handler: (value: Point) => void): void;

  /**
   * Asynchronously retrieves size
   * @param identifier - Object identifier (null for view itself)
   * @param type - "size"
   * @param handler - Callback receiving size
   */
  geometry(identifier: string | null, type: "size", handler: (value: Size) => void): void;

  /**
   * Asynchronously retrieves custom geometry
   * @param identifier - Object identifier (null for view itself)
   * @param type - Geometry type
   * @param handler - Callback receiving geometry value
   */
  geometry(identifier: string | null, type: string, handler: (value: any) => void): void;

  /**
   * Changes layout/frame of an object with optional animation
   * @param identifier - Object identifier
   * @param layout - New layout rectangle
   * @param options - Animation options (optional)
   */
  layout(identifier: string, layout: Rect, options?: LayoutOptions): void;

  /**
   * Moves an object to a new position with optional animation
   * @param identifier - Object identifier
   * @param point - New position
   * @param options - Animation options (optional)
   */
  move(identifier: string, point: Point, options?: LayoutOptions): void;

  /**
   * Sets center point of an object with optional animation
   * @param identifier - Object identifier
   * @param point - New center point
   * @param options - Animation options (optional)
   */
  center(identifier: string, point: Point, options?: LayoutOptions): void;
}


// ============================================================================
// Exports
// ============================================================================

export {
  ViewBridge
};
