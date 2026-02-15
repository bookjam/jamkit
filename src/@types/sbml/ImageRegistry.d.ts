/**
 * Image registry types
 */

/**
 * SbmlScreenSize - Screen size classification
 */
export enum SbmlScreenSize {
  Universal = 'u',
  Small = 'p',  // ~ 6 inch
  Large = 't'   // ~ 19 inch
}

/**
 * SbmlAspectRatio - Aspect ratio classification
 */
export enum SbmlAspectRatio {
  Universal = 'u',
  Ratio_4_3 = 'x',   // 1.333333
  Ratio_3_2 = 'v',   // 1.5
  Ratio_5_3 = 'w',   // 1.666666
  Ratio_16_9 = 'h'   // 1.777777
}

/**
 * SbmlOrientation - Screen orientation
 * Note: This is a numeric enum to allow array indexing (unlike iOS char enum)
 */
export enum SbmlOrientation {
  Portrait = 0,
  Landscape = 1
}

/**
 * SbmlPageSideCount - Number of page sides
 */
export enum SbmlPageSideCount {
  Universal = '0',
  One = '1',
  Two = '2'
}

/**
 * SbmlDensity - Screen density
 */
export enum SbmlDensity {
  Undefined = 0,
  LDPI = 'l',   // low-density (~120: 0.75)
  MDPI = 'm',   // medium-density (~160: 1.0)
  HDPI = 'h',   // high-density (~240: 1.5)
  XHDPI = 'x',  // extra high-density (~320: 2.0)
  SHDPI = 's',  // super high-density (~400: 2.5)
  UHDPI = 'u'   // ultra high-density (~480: 3.0)
}

/**
 * SbmlImageSuffix - Image file suffix components
 */
export interface SbmlImageSuffix {
  screenSize: SbmlScreenSize;
  aspectRatio: SbmlAspectRatio;
  orientation: SbmlOrientation;
  pageSideCount: SbmlPageSideCount;
  density: SbmlDensity;
}
