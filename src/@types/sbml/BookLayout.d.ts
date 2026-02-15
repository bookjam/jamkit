/**
 * Book layout types
 */

/**
 * SbmlPageDirection - Direction of page progression
 */
export enum SbmlPageDirection {
  L2R = 0,  // Left to Right
  R2L = 1   // Right to Left
}

/**
 * SbmlBookLayout - Book layout configuration
 */
export interface SbmlBookLayout {
  isTwoSided: boolean;
  pageDirection: SbmlPageDirection;
  pageWidth: number;
  pageHeight: number;
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginLeft: number;
  pageMarginRight: number;
  pageGutterLeft: number;
  pageGutterRight: number;
  statusBarHeight: number;
  edgeBottom: number;
}
