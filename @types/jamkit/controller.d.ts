/**
 * Jamkit Controller JavaScript API Type Definitions
 *
 * This file provides TypeScript type definitions for Jamkit's controller
 * JavaScript interface and common controller actions.
 */

import type { ObjectBridge } from "./object";
import type { ViewBridge } from "./view";

// ============================================================================
// Controller Action Parameters
// ============================================================================

/**
 * Navigation action parameters
 */
interface NavigationParams {
  /** Target view type */
  "target"?: "view" | "page" | "popup" | "detail" | "self" | "browser";
  /** Catalog identifier */
  "catalog"?: string;
  /** Subcatalog identifier */
  "subcatalog"?: string;
  /** Category identifier */
  "category"?: string;
  /** Display unit configuration */
  "display-unit"?: string;
}

/**
 * UI control action parameters
 */
interface UIControlParams {
  /** Object identifier */
  "object"?: string;
  /** Group identifier */
  "group"?: string;
  /** Toggle visibility */
  "toggle"?: "yes" | "no";
  /** Layout configuration identifier */
  "layout"?: string;
  /** Loading message to display */
  "message"?: string;
  /** Additional property key-value pairs */
  [key: string]: any;
}

/**
 * Data management action parameters
 */
interface DataManagementParams {
  /** Form identifier */
  "form"?: string | Record<string, any>;
  /** Submit target */
  "target"?: "cloud" | "url" | "catalog" | "object" | "owner" | "group";
  /** Target URL (when target is url) */
  "url"?: string;
  /** Categories to add */
  "categories-to-add"?: string[];
  /** Categories to remove */
  "categories-to-remove"?: string[];
  /** Toggle mode */
  "toggle"?: "yes" | "no";
  /** Collection identifier */
  "collection"?: string;
  /** Showcase identifier */
  "showcase"?: string;
  /** Panes to remove */
  "panes"?: string;
  /** Banner to remove */
  "banner"?: string;
  /** Item identifier */
  "item"?: string;
  /** Object identifier */
  "object"?: string;
  /** Group identifier */
  "group"?: string;
  /** Success message */
  "message-when-right"?: string;
  /** Error message */
  "message-when-wrong"?: string;
}

/**
 * Media action parameters
 */
interface MediaActionParams {
  /** Media type (audio, video, image, text) */
  "media"?: string;
  /** Text content */
  "text"?: string;
  [key: string]: any;
}

/**
 * System action parameters
 */
interface SystemActionParams {
  /** Title */
  "title"?: string;
  /** Message */
  "message"?: string;
  /** Error type */
  "error"?: string;
  /** URL to share */
  "url"?: string;
  /** Text to share or copy */
  "text"?: string;
  /** Media type */
  "media"?: string;
  /** JavaScript code to execute */
  "script"?: string;
  /** Form data context */
  "form"?: Record<string, any>;
  /** Button configurations */
  "buttons"?: ButtonConfig[];
  /** Target */
  "target"?: "clipboard" | "autorun" | "app";
  [key: string]: any;
}

/**
 * Copy action parameters
 */
interface CopyActionParams {
  /** Text to copy */
  "text"?: string;
  /** Media to copy */
  "media"?: string;
}

/**
 * Share action parameters
 */
interface ShareActionParams {
  /** Text to share */
  "text"?: string;
  /** URL to share */
  "url"?: string;
  /** Media to share */
  "media"?: string;
}

/**
 * Notify action parameters
 */
interface NotifyActionParams {
  /** Notification title */
  "title"?: string;
  /** Notification message */
  "message"?: string;
  /** Target catalog */
  "target"?: "catalog";
}

/**
 * Alert action parameters
 */
interface AlertActionParams {
  /** Alert title */
  "title"?: string;
  /** Alert message */
  "message"?: string;
  /** Error type */
  "error"?: string;
}

/**
 * Toast action parameters
 */
interface ToastActionParams {
  /** Toast message */
  "message"?: string;
}

/**
 * Prompt action parameters
 */
interface PromptActionParams {
  /** Prompt title */
  "title"?: string;
  /** Prompt message */
  "message"?: string;
  /** Button configurations */
  "buttons"?: ButtonConfig[];
}

/**
 * Script action parameters
 */
interface ScriptActionParams {
  /** JavaScript code to execute */
  "script"?: string;
  /** Form data context */
  "form"?: Record<string, any>;
}

/**
 * Button configuration for prompts
 */
interface ButtonConfig {
  /** Button label */
  "label": string;
  /** Action to execute when pressed */
  "action"?: string;
  /** Action parameters */
  "params"?: Record<string, any>;
  /** Button style */
  "style"?: "default" | "cancel" | "destructive";
}

/**
 * Combined action parameters type
 */
type ActionParams =
  | NavigationParams
  | UIControlParams
  | DataManagementParams
  | MediaActionParams
  | SystemActionParams
  | Record<string, any>;

// ============================================================================
// Group Interface
// ============================================================================

/**
 * Group of objects interface
 */
interface ObjectGroup {
  /** Objects in the group */
  objects: ObjectBridge[];
  /** Show all objects in group */
  show(): void;
  /** Hide all objects in group */
  hide(): void;
  [key: string]: any;
}

/**
 * Catalog interface
 */
interface Catalog {
  /** Reload the catalog */
  reload(): void;
  /** Get catalog data */
  data(): any;
  /** Update catalog data */
  update(data: any): void;
  [key: string]: any;
}

/**
 * Store interface
 */
interface Store {
  /** Get store data */
  data(): any;
  /** Reload store */
  reload(): void;
  [key: string]: any;
}

/**
 * Bookcase interface (user's library)
 */
interface Bookcase {
  /** Get bookcase items */
  items(): any[];
  /** Add item to bookcase */
  add(item: any): void;
  /** Remove item from bookcase */
  remove(itemId: string): void;
  [key: string]: any;
}

/**
 * Product information
 */
interface ProductInfo {
  /** Product identifier */
  id: string;
  /** Product title */
  title: string;
  /** Product price */
  price: number;
  /** Additional product data */
  [key: string]: any;
}

/**
 * Membership information
 */
interface MembershipInfo {
  /** Membership level */
  level: string;
  /** Membership status */
  status: string;
  /** Additional membership data */
  [key: string]: any;
}

// ============================================================================
// Controller Interface
// ============================================================================

/**
 * Main controller interface available in JavaScript context
 */
interface ControllerBridge {
  // Action Execution

  /**
   * Executes catalog navigation action
   * @param action - "catalog", "subcatalog", or "category"
   * @param params - Navigation parameters
   */
  action(action: "catalog" | "subcatalog" | "category", params?: NavigationParams): void;

  /**
   * Executes view navigation action
   * @param action - "page", "popup", "detail", or "bottom-sheet"
   * @param params - Navigation parameters
   */
  action(action: "page" | "popup" | "detail" | "bottom-sheet", params?: NavigationParams): void;

  /**
   * Executes navigation back action
   * @param action - Back action name
   */
  action(action: "catalog-back" | "category-back" | "page-back" | "popup-close" | "detail-back" | "bottom-sheet-close"): void;

  /**
   * Executes UI control action
   * @param action - "show", "hide", "toggle", or "property"
   * @param params - UI control parameters
   */
  action(action: "show" | "hide" | "toggle" | "property", params?: UIControlParams): void;

  /**
   * Executes UI state action
   * @param action - State action name
   */
  action(action: "layout" | "reload" | "minimize" | "maximize" | "clear" | "reset" | "freeze" | "unfreeze" | "hide-keyboard"): void;

  /**
   * Executes data management action
   * @param action - "submit", "categorize", "remove", "review", or "answer"
   * @param params - Data management parameters
   */
  action(action: "submit" | "categorize" | "remove" | "review" | "answer", params?: DataManagementParams): void;

  /**
   * Executes media playback control action
   * @param action - "play", "pause", or "stop"
   * @param params - Media action parameters
   */
  action(action: "play" | "pause" | "stop", params?: MediaActionParams): void;

  /**
   * Executes media recording action
   * @param action - "record"
   * @param params - Media action parameters
   */
  action(action: "record", params?: MediaActionParams): void;

  /**
   * Executes media info action
   * @param action - "bgm", "now-playing-info", or "now-working-info"
   * @param params - Media action parameters
   */
  action(action: "bgm" | "now-playing-info" | "now-working-info", params?: MediaActionParams): void;

  /**
   * Executes media file action
   * @param action - "pick" or "save"
   * @param params - Media action parameters
   */
  action(action: "pick" | "save", params?: MediaActionParams): void;

  /**
   * Executes copy to clipboard action
   * @param action - "copy"
   * @param params - Copy action parameters
   */
  action(action: "copy", params?: CopyActionParams): void;

  /**
   * Executes share action
   * @param action - "share"
   * @param params - Share action parameters
   */
  action(action: "share", params?: ShareActionParams): void;

  /**
   * Executes notification action
   * @param action - "notify"
   * @param params - Notify action parameters
   */
  action(action: "notify", params?: NotifyActionParams): void;

  /**
   * Cancels notifications
   * @param action - "notify-cancel"
   */
  action(action: "notify-cancel"): void;

  /**
   * Shows alert dialog
   * @param action - "alert"
   * @param params - Alert action parameters
   */
  action(action: "alert", params?: AlertActionParams): void;

  /**
   * Shows toast message
   * @param action - "toast"
   * @param params - Toast action parameters
   */
  action(action: "toast", params?: ToastActionParams): void;

  /**
   * Shows prompt dialog
   * @param action - "prompt"
   * @param params - Prompt action parameters
   */
  action(action: "prompt", params?: PromptActionParams): void;

  /**
   * Executes JavaScript code
   * @param action - "script"
   * @param params - Script action parameters
   */
  action(action: "script", params?: ScriptActionParams): void;

  /**
   * Sends analytics event
   * @param action - "analytics"
   * @param params - System action parameters
   */
  action(action: "analytics", params?: SystemActionParams): void;

  /**
   * Triggers haptic feedback or snooze
   * @param action - "vibrate" or "snooze"
   */
  action(action: "vibrate" | "snooze"): void;

  /**
   * Executes custom action
   * @param action - Action name
   * @param params - Action parameters
   */
  action(action: string, params?: ActionParams): void;

  /**
   * Updates data binding for UI elements
   * @param identifier - UI element identifier
   * @param data - Data to bind to element
   */
  update(identifier: string, data: Record<string, any>): void;

  // Object Access

  /**
   * Returns the object bridge
   * @param identifier - Object ID to retrieve
   * @returns Object bridge
   */
  object(identifier: string): ObjectBridge;

  /**
   * Returns a group of objects by identifier
   * @param identifier - Group identifier
   * @returns Group of objects
   */
  group(identifier: string): ObjectGroup;

  /**
   * Returns the view bridge
   * @param identifier - View identifier
   * @returns View bridge
   */
  view(identifier: string): ViewBridge;

  // Store Integration

  /**
   * Returns the catalog instance
   * @param identifier - Catalog identifier
   * @returns Catalog instance
   */
  catalog(identifier: string): Catalog;

  /**
   * Returns the store instance
   * @param identifier - Store identifier
   * @returns Store instance
   */
  store(identifier: string): Store;

  /**
   * Returns the bookcase instance
   * @param identifier - Bookcase identifier
   * @returns Bookcase instance
   */
  bookcase(identifier: string): Bookcase;

  // Product and User Data

  /**
   * Retrieves product information with callback
   * @param identifier - Product identifier
   * @param handler - Callback function to receive product data
   */
  product(identifier: string, handler: (product: ProductInfo) => void): void;

  /**
   * Retrieves user points/credits with callback
   * @param identifier - Points/credits identifier
   * @param handler - Callback function to receive points data
   */
  points(identifier: string, handler: (points: number) => void): void;

  /**
   * Retrieves membership information with callback
   * @param identifier - Membership identifier
   * @param handler - Callback function to receive membership data
   */
  membership(identifier: string, handler: (membership: MembershipInfo) => void): void;

  // System Data Access

  /**
   * Retrieves data by key and identifier
   * @param key - Data key
   * @param identifier - Data identifier
   * @returns Retrieved data object
   */
  data(key: string, identifier: string): any;

  /**
   * Retrieves global values by key
   * @param key - Value key
   * @returns Retrieved value
   */
  value(key: string): any;

  /**
   * Retrieves application settings by key
   * @param key - Settings key
   * @returns Settings value
   */
  settings(key: string): any;

  /**
   * Retrieves system status information by key
   * @param key - Status key
   * @returns Status information
   */
  status(key: string): any;

  /**
   * Retrieves module instances by key and identifier
   * @param key - Module key
   * @param identifier - Module identifier
   * @returns Module instance
   */
  module(key: string, identifier: string): any;
}


// ============================================================================
// Controller Action Names
// ============================================================================

/**
 * All available controller action names
 */
type ControllerActionName =
  // Navigation Actions
  | "catalog"
  | "subcatalog"
  | "catalog-back"
  | "category"
  | "category-back"
  | "page"
  | "page-back"
  | "popup"
  | "popup-close"
  | "detail"
  | "detail-back"
  | "bottom-sheet"
  | "bottom-sheet-close"
  // UI Control Actions
  | "layout"
  | "reload"
  | "minimize"
  | "maximize"
  | "show"
  | "hide"
  | "toggle"
  | "clear"
  | "reset"
  | "property"
  | "freeze"
  | "unfreeze"
  | "hide-keyboard"
  // Data Management Actions
  | "submit"
  | "categorize"
  | "remove"
  | "review"
  | "answer"
  // Media Actions
  | "play"
  | "record"
  | "pause"
  | "stop"
  | "bgm"
  | "now-playing-info"
  | "now-working-info"
  | "pick"
  | "save"
  // System Actions
  | "copy"
  | "share"
  | "script"
  | "notify"
  | "notify-cancel"
  | "prompt"
  | "alert"
  | "toast"
  | "vibrate"
  | "analytics"
  | "snooze";

// ============================================================================
// Exports for module usage
// ============================================================================

export {
  ControllerBridge,
  ObjectGroup,
  Catalog,
  Store,
  Bookcase,
  ProductInfo,
  MembershipInfo,
  ActionParams,
  NavigationParams,
  UIControlParams,
  DataManagementParams,
  MediaActionParams,
  SystemActionParams,
  CopyActionParams,
  ShareActionParams,
  NotifyActionParams,
  AlertActionParams,
  ToastActionParams,
  PromptActionParams,
  ScriptActionParams,
  ButtonConfig,
  ControllerActionName
};

// Re-export from other modules
export type { ViewBridge } from "./view";
export type { ObjectBridge } from "./object";
