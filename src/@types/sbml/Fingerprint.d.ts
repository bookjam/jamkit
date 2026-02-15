/**
 * Fingerprint types
 */

import type { BonMap } from "./Bon.js";

/**
 * SbmlFingerprint - Utility class for generating fingerprints from book information.
 * This class provides a WASM wrapper for the native C++ MD5-based fingerprint generation.
 */
export interface SbmlFingerprint {
  /**
   * Generate a fingerprint from book info and device ID.
   * Returns a base64-encoded MD5 hash of the format: "deviceID:title:author:version"
   *
   * @param info BonMap containing book information (title, author, version)
   * @param deviceID The device identifier
   * @return Base64-encoded MD5 hash string, or empty string if info is invalid
   */
  generateFingerprint(info: BonMap, deviceID: string): string;
}
