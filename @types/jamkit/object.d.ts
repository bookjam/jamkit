/**
 * Jamkit Object JavaScript API Type Definitions
 *
 * This file provides TypeScript type definitions for Jamkit's object
 * JavaScript interface and common object actions.
 */

import type { Rect, Point, Size, LayoutOptions } from "./geometry";
import type { ActionParams, ScriptActionParams } from "./actions";
import { ViewBridge } from "./view";

// ============================================================================
// Object Property Types
// ============================================================================

/**
 * Common object properties
 */
interface ObjectProperties {
  /** Object identifier */
  "id"?: string;
  /** Object label/text */
  "label"?: string;
  /** Hidden state */
  "hidden"?: "yes" | "no";
  /** Alpha/opacity (0.0 - 1.0 as string) */
  "alpha"?: string;
  /** Rotation angle in degrees */
  "rotation"?: string;
  /** Scale factor */
  "scale"?: string;
  /** Draggable state */
  "draggable"?: "yes" | "no";
  /** Content background color */
  "content-background-color"?: string;
  /** Content border color */
  "content-border-color"?: string;
  /** Content border width */
  "content-border-width"?: string;
  /** Content border radius */
  "content-border-radius"?: string;
  /** Additional properties */
  [key: string]: any;
}

// ============================================================================
// Object Action Parameters
// ============================================================================

/**
 * Property action parameters
 */
interface PropertyActionParams extends ActionParams {
  /** Properties to set */
  "properties": string;
}

/**
 * Show action parameters
 */
interface ShowActionParams extends ActionParams {
  /** Toggle visibility */
  "toggle"?: "yes" | "no";
}

/**
 * Rotate action parameters
 */
interface RotateActionParams extends ActionParams {
  /** Rotation duration in seconds */
  "duration"?: string;
}

/**
 * Capture action parameters
 */
interface CaptureActionParams extends ActionParams {
  /** Filename for captured image */
  "filename": string;
}

// ============================================================================
// Object Action Names
// ============================================================================

/**
 * Built-in object action names
 */
type ObjectActionName =
  | "property"
  | "show"
  | "hide"
  | "save-state"
  | "restore-state"
  | "reset-state"
  | "wait"
  | "wait-done"
  | "rotate"
  | "stop-rotate"
  | "capture"
  | "script";

// ============================================================================
// Object Interface
// ============================================================================

/**
 * Main object interface available in JavaScript context
 */
interface ObjectBridge {
  // ========================================
  // Action Methods
  // ========================================

  /**
   * Triggers an action on the object
   * @param action - Action name
   * @param params - Action parameters
   */
  action(action: "property", params?: PropertyActionParams): void;
  action(action: "show", params?: ShowActionParams): void;
  action(action: "hide"): void;
  action(action: "save-state"): void;
  action(action: "restore-state"): void;
  action(action: "reset-state"): void;
  action(action: "wait"): void;
  action(action: "wait-done"): void;
  action(action: "rotate", params?: RotateActionParams): void;
  action(action: "stop-rotate"): void;
  action(action: "capture", params?: CaptureActionParams): void;
  action(action: "script", params?: ScriptActionParams): void;
  action(action: string, params?: Record<string, any>): void;

  /**
   * Sets multiple properties on the object
   * @param props - Properties to set
   */
  property(props: ObjectProperties): void;

  // ========================================
  // Value Methods
  // ========================================

  /**
   * Gets object's main value (synchronous)
   * @returns Object value
   */
  value(): any;

  /**
   * Gets object's main value (asynchronous)
   * @param property - null for main value
   * @param handler - Callback to receive value
   */
  value(property: null, handler: (value: any) => void): void;

  /**
   * Gets a specific property value (synchronous)
   * @param property - Property name
   * @returns Property value
   */
  value(property: string): any;

  /**
   * Gets a specific property value (asynchronous)
   * @param property - Property name
   * @param handler - Callback to receive value
   */
  value(property: string, handler: (value: any) => void): void;

  /**
   * Gets formatted value for a property
   * @param property - Property name
   * @returns Formatted value
   */
  format(property: string): string;

  // ========================================
  // Data Methods
  // ========================================

  /**
   * Gets object-specific data
   * @param key - Data key
   * @returns Data value
   */
  data(key: "image"): any; // For PapyrusImageView
  data(key: "cookie"): any; // For PapyrusWebView
  data(key: string): any;

  /**
   * Sets object-specific data
   * @param key - Data key
   * @param value - Value to set
   */
  data(key: "image", value: any): void;
  data(key: "cookie", value: any): void;
  data(key: string, value: any): void;

  /**
   * Retrieves form data
   * @param identifier - Form identifier
   * @returns All form data
   */
  form(identifier: string): Record<string, any>;

  /**
   * Retrieves specific form field value
   * @param identifier - Form identifier
   * @param key - Field key
   * @returns Field value
   */
  form(identifier: string, key: string): any;

  /**
   * Retrieves child object view
   * @param key - View lookup key (optional)
   * @param identifier - Object identifier
   * @returns Child object bridge
   */
  view(key: string | null, identifier: string): ViewBridge;

  // ========================================
  // Geometry Methods
  // ========================================

  /**
   * Retrieves frame geometry
   * @param identifier - Object identifier (null for self)
   * @param type - "frame"
   * @param handler - Callback receiving frame rectangle
   */
  geometry(identifier: string | null, type: "frame", handler: (value: Rect) => void): void;

  /**
   * Retrieves bounds geometry
   * @param identifier - Object identifier (null for self)
   * @param type - "bounds"
   * @param handler - Callback receiving bounds rectangle
   */
  geometry(identifier: string | null, type: "bounds", handler: (value: Rect) => void): void;

  /**
   * Retrieves center point
   * @param identifier - Object identifier (null for self)
   * @param type - "center"
   * @param handler - Callback receiving center point
   */
  geometry(identifier: string | null, type: "center", handler: (value: Point) => void): void;

  /**
   * Retrieves size
   * @param identifier - Object identifier (null for self)
   * @param type - "size"
   * @param handler - Callback receiving size
   */
  geometry(identifier: string | null, type: "size", handler: (value: Size) => void): void;

  /**
   * Retrieves any geometry type
   * @param identifier - Object identifier (null for self)
   * @param type - Geometry type
   * @param handler - Callback receiving geometry value
   */
  geometry(identifier: string | null, type: string, handler: (value: any) => void): void;

  // ========================================
  // Layout Methods
  // ========================================

  /**
   * Changes layout/frame of an object
   * @param identifier - Object identifier (null for self)
   * @param layout - New frame rectangle
   * @param options - Layout options (optional)
   */
  layout(identifier: string | null, layout: Rect, options?: LayoutOptions): void;

  /**
   * Moves object to new position
   * @param identifier - Object identifier (null for self)
   * @param point - New position
   * @param options - Layout options (optional)
   */
  move(identifier: string | null, point: Point, options?: LayoutOptions): void;

  /**
   * Centers object at specified point
   * @param identifier - Object identifier (null for self)
   * @param point - Center point
   * @param options - Layout options (optional)
   */
  center(identifier: string | null, point: Point, options?: LayoutOptions): void;

  /**
   * Centers object in parent container
   * @param identifier - Object identifier (null for self)
   * @param point - null to center in parent
   * @param options - Layout options (optional)
   */
  center(identifier: string | null, point: null, options?: LayoutOptions): void;

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Show the object
   */
  show(): void;

  /**
   * Hide the object
   */
  hide(): void;

  /**
   * Additional dynamic properties and methods
   */
  [key: string]: any;
}


// ============================================================================
// Exports
// ============================================================================

export {
  ObjectBridge,
  ObjectProperties,
  PropertyActionParams,
  ShowActionParams,
  RotateActionParams,
  CaptureActionParams,
  ObjectActionName
};
