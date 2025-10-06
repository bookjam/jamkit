/**
 * Jamkit Action Parameters Type Definitions
 *
 * This file provides TypeScript type definitions for common action parameters
 * used across Jamkit's JavaScript interfaces.
 */

// ============================================================================
// Base Action Parameters
// ============================================================================

/**
 * Base action parameters with post-action support
 */
export interface ActionParams {
  /** Action target */
  "target"?: "app" | "owner" | "object" | "popup";
  /** Target app identifier (required when target is "app") */
  "app"?: string;
  /** Target owner identifier (required when target is "owner") */
  "owner"?: string;
  /** Target object identifier (required when target is "object") */
  "object"?: string;
  /** Action to execute after completion */
  "post-action"?: string;
  /** Parameters for post-action */
  "post-params"?: string;
  /** Additional parameters */
  [key: string]: any;
}

// ============================================================================
// Specific Action Parameters
// ============================================================================

/**
 * Script action parameters
 */
export interface ScriptActionParams extends ActionParams {
  /** JavaScript code to execute */
  "script"?: string;
  /** Form identifier for context */
  "form"?: string;
}
