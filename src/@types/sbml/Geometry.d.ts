/**
 * Basic geometry types for libsbml
 */

/**
 * Size - Object dimensions (width and height)
 */
export interface Size {
  width: number;
  height: number;
  delete(): void;
}

export interface SizeConstructor {
  new(width: number, height: number): Size;
}

/**
 * Point - 2D coordinates (x and y)
 */
export interface Point {
  x: number;
  y: number;
  delete(): void;
}

export interface PointConstructor {
  new(x: number, y: number): Point;
}

/**
 * Rect - Rectangle coordinates
 */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  delete(): void;
}

export interface RectConstructor {
  new(left: number, top: number, right: number, bottom: number): Rect;
}

/**
 * ScreenSpec - Screen specification for layout calculation
 */
export interface ScreenSpec {
  width: number;
  height: number;
  density: number;
  scale: number;
  dpFactor: number;
  dpBased: boolean;
  statusbarHeight: number;
  edgeBottom: number;
}

export interface ScreenSpecConstructor {
  new(): ScreenSpec;
}
