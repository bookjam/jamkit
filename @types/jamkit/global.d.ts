/**
 * Jamkit Global JavaScript API Type Definitions
 *
 * This file provides TypeScript type definitions for Jamkit's global JavaScript APIs
 * including module system, network, file system, media, device, and utility functions.
 */

import type { ControllerBridge } from "./controller";
import type { ViewBridge } from "./view";
import type { ObjectBridge } from "./object";

declare global {
  // ============================================================================
  // Module System
  // ============================================================================

  /**
   * Loads and returns a JavaScript module
   * @param moduleName - The module name or path to load
   * @returns The module exports object
   */
  function require(moduleName: string): any;

  /**
   * Includes and executes a JavaScript file at the specified path
   * @param path - The file path to include
   * @returns The result of executing the script
   */
  function include(path: string): any;

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
  function fetch(url: string, params?: FetchParams): Promise<FetchResponse>;

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
  function download(url: string, rootPath: RootPath, name: string, params?: Record<string, any>): Promise<string>;

  /**
   * Uploads a file to a URL
   * @param url - The upload URL
   * @param rootPath - Root directory path
   * @param name - File name to upload
   * @param params - Optional additional parameters
   * @returns Promise resolving to response object
   */
  function upload(url: string, rootPath: RootPath, name: string, params?: Record<string, any>): Promise<FetchResponse>;

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
  function read(rootPath: RootPath, name: string, variables?: Record<string, string>): Promise<string>;

  /**
   * Writes text to a file
   * @param rootPath - Root directory path
   * @param name - File name
   * @param text - Content to write
   * @returns Promise resolving to the file path
   */
  function write(rootPath: RootPath, name: string, text: string): Promise<string>;

  /**
   * Checks if a file exists
   * @param rootPath - Root directory path
   * @param name - File name
   * @returns Promise resolving to the file path if exists, rejects otherwise
   */
  function exist(rootPath: RootPath, name: string): Promise<string>;

  /**
   * Creates a ZIP archive
   * @param pathToZip - Path to compress
   * @param rootPath - Destination root directory
   * @param name - ZIP file name
   * @returns Promise resolving to the ZIP file path
   */
  function zip(pathToZip: string, rootPath: RootPath, name: string): Promise<string>;

  /**
   * Extracts a ZIP archive
   * @param pathToUnzip - ZIP file path
   * @param rootPath - Extraction root directory
   * @param name - Extraction directory name
   * @returns Promise resolving to the extraction path
   */
  function unzip(pathToUnzip: string, rootPath: RootPath, name: string): Promise<string>;

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
  function media(type: MediaType, name: string, options?: MediaOptions): Promise<any>;

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
  function device(type: DeviceInfoType): string;

  /**
   * Directory types
   */
  type DirectoryType = "document" | "library" | "cache" | "temporary" | "books" | "removable-storage";

  /**
   * Gets system directory paths
   * @param type - Directory type
   * @returns Directory path or array of paths (for removable-storage)
   */
  function directory(type: DirectoryType): string | string[];

  // ============================================================================
  // Utility APIs
  // ============================================================================

  /**
   * Executes a function after a delay
   * @param seconds - Delay in seconds
   * @param handler - Function to execute
   */
  function timeout(seconds: number, handler: () => void): void;

  // ============================================================================
  // Context Variables
  // ============================================================================

  /**
   * Template variables available in the current context
   */
  const $data: Record<string, string>;

  /**
   * Environment variables and settings
   */
  const $env: Record<string, string>;

  /**
   * Reference to the current controller object (when available)
   */
  const controller: ControllerBridge | undefined;

  /**
   * Reference to the current view object
   */
  const view: ViewBridge;

  /**
   * Reference to the owner object (when available)
   */
  const owner: ObjectBridge | undefined;

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
}

export {};
