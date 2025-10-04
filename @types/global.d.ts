/**
 * Jamkit Global JavaScript API Type Definitions
 *
 * This file provides TypeScript type definitions for Jamkit's global JavaScript APIs
 * including module system, network, file system, media, device, and utility functions.
 */

// ============================================================================
// Module System
// ============================================================================

/**
 * Loads and returns a JavaScript module
 * @param moduleName - The module name or path to load
 * @returns The module exports object
 */
declare function require(moduleName: string): any;

/**
 * Includes and executes a JavaScript file at the specified path
 * @param path - The file path to include
 * @returns The result of executing the script
 */
declare function include(path: string): any;

// ============================================================================
// Network APIs
// ============================================================================

/**
 * Request parameters for fetch operations
 */
interface FetchParams {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: string | FormData | Blob;
}

/**
 * Response object from fetch operations
 */
interface FetchResponse {
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Parse response as JSON */
  json(): Promise<any>;
  /** Get response as text */
  text(): Promise<string>;
  /** Get response as blob */
  blob(): Promise<Blob>;
}

/**
 * Makes an HTTP request and returns a promise
 * @param url - The URL to fetch
 * @param params - Optional request parameters
 * @returns Promise resolving to response object
 */
declare function fetch(url: string, params?: FetchParams): Promise<FetchResponse>;

/**
 * Root directory path types for file operations
 */
type RootPath = "document" | "cache" | "library" | "temporary" | "books" | "removable-storage";

/**
 * Downloads a file from a URL
 * @param url - The URL to download from
 * @param rootPath - Root directory path
 * @param name - File name to save as
 * @param params - Optional request parameters
 * @returns Promise resolving to the downloaded file path
 */
declare function download(url: string, rootPath: RootPath, name: string, params?: Record<string, any>): Promise<string>;

/**
 * Uploads a file to a URL
 * @param url - The upload URL
 * @param rootPath - Root directory path
 * @param name - File name to upload
 * @param params - Optional additional parameters
 * @returns Promise resolving to response object
 */
declare function upload(url: string, rootPath: RootPath, name: string, params?: Record<string, any>): Promise<FetchResponse>;

// ============================================================================
// File System APIs
// ============================================================================

/**
 * Reads a file from the file system
 * @param rootPath - Root directory path
 * @param name - File name
 * @param variables - Optional template variables for file processing
 * @returns Promise resolving to file contents
 */
declare function read(rootPath: RootPath, name: string, variables?: Record<string, string>): Promise<string>;

/**
 * Writes text to a file
 * @param rootPath - Root directory path
 * @param name - File name
 * @param text - Content to write
 * @returns Promise resolving to the file path
 */
declare function write(rootPath: RootPath, name: string, text: string): Promise<string>;

/**
 * Checks if a file exists
 * @param rootPath - Root directory path
 * @param name - File name
 * @returns Promise resolving to the file path if exists, rejects otherwise
 */
declare function exist(rootPath: RootPath, name: string): Promise<string>;

/**
 * Creates a ZIP archive
 * @param pathToZip - Path to compress
 * @param rootPath - Destination root directory
 * @param name - ZIP file name
 * @returns Promise resolving to the ZIP file path
 */
declare function zip(pathToZip: string, rootPath: RootPath, name: string): Promise<string>;

/**
 * Extracts a ZIP archive
 * @param pathToUnzip - ZIP file path
 * @param rootPath - Extraction root directory
 * @param name - Extraction directory name
 * @returns Promise resolving to the extraction path
 */
declare function unzip(pathToUnzip: string, rootPath: RootPath, name: string): Promise<string>;

// ============================================================================
// Media APIs
// ============================================================================

/**
 * Media type options
 */
type MediaType = "image" | "video" | "audio";

/**
 * Options for image media processing
 */
interface ImageMediaOptions {
  /** Output format (raw, base64, etc.) */
  output?: string;
  /** Target width */
  width?: number;
  /** Target height */
  height?: number;
  /** Use high quality */
  "high-quality"?: boolean;
}

/**
 * Options for media processing
 */
type MediaOptions = ImageMediaOptions | Record<string, any>;

/**
 * Loads and processes media resources
 * @param type - Media type (image, video, audio)
 * @param name - Media resource name
 * @param options - Optional media processing options
 * @returns Promise resolving to media object or data
 */
declare function media(type: MediaType, name: string, options?: MediaOptions): Promise<any>;

// ============================================================================
// Device APIs
// ============================================================================

/**
 * Device information types
 */
type DeviceInfoType = "id" | "name" | "model" | "token" | "os" | "version" | "language" | "country";

/**
 * Gets device information
 * @param type - Information type to retrieve
 * @returns The requested device information
 */
declare function device(type: DeviceInfoType): string;

/**
 * Directory types
 */
type DirectoryType = "document" | "library" | "cache" | "temporary" | "books" | "removable-storage";

/**
 * Gets system directory paths
 * @param type - Directory type
 * @returns Directory path or array of paths (for removable-storage)
 */
declare function directory(type: DirectoryType): string | string[];

// ============================================================================
// Utility APIs
// ============================================================================

/**
 * Executes a function after a delay
 * @param seconds - Delay in seconds
 * @param handler - Function to execute
 */
declare function timeout(seconds: number, handler: () => void): void;

// ============================================================================
// Context Variables
// ============================================================================

/**
 * Template variables available in the current context
 */
declare const $data: Record<string, string>;

/**
 * Environment variables and settings
 */
declare const $env: Record<string, string>;

/**
 * Controller interface (when available in context)
 */
interface Controller {
  /** Reload the controller */
  reload(): void;
  /** Navigate to a route */
  navigate(route: string): void;
  [key: string]: any;
}

/**
 * Reference to the current controller object (when available)
 */
declare const controller: Controller | undefined;

/**
 * View interface
 */
interface View {
  /** Update the view */
  update(): void;
  /** Show the view */
  show(): void;
  [key: string]: any;
}

/**
 * Reference to the current view object
 */
declare const view: View;

/**
 * Owner interface (when available in context)
 */
interface Owner {
  /** Notify with an event and data */
  notify(event: string, data?: any): void;
  [key: string]: any;
}

/**
 * Reference to the owner object (when available)
 */
declare const owner: Owner | undefined;

// ============================================================================
// String Extensions
// ============================================================================

/**
 * Unicode normalization types
 */
type NormalizationType = "NFC" | "NFD" | "NFKC" | "NFKD";

interface String {
  /**
   * Normalizes Unicode strings
   * @param type - Normalization type (NFC, NFD, NFKC, NFKD)
   * @returns Normalized string
   */
  normalize(type?: NormalizationType): string;
}
