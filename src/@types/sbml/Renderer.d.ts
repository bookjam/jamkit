/**
 * SBML Renderer types
 */

import type { Rect } from "./Geometry.js";
import type { Book } from "./Book.js";

/**
 * SbmlRendererDelegate - JavaScript implementation interface (iOS-style)
 * Provide immediate rendering primitives
 */
export interface SbmlRendererDelegate {
  /**
   * Fill a rectangle with a solid color
   * @param left - Left coordinate
   * @param top - Top coordinate
   * @param right - Right coordinate
   * @param bottom - Bottom coordinate
   * @param color - ARGB color value
   * @param radius - Corner radius array [topLeft, topRight, bottomRight, bottomLeft] or null
   */
  fillRect?(left: number, top: number, right: number, bottom: number, color: number, radius: number[] | null): void;

  /**
   * Draw text
   * @param left - Left coordinate
   * @param top - Top coordinate
   * @param right - Right coordinate
   * @param bottom - Bottom coordinate
   * @param text - Text to draw
   * @param fontSpec - Font specification object
   * @param direction - Text direction (0=LTR, 1=RTL, etc)
   * @param color - ARGB color value
   * @param matrix - Optional transformation matrix [a,b,c,d,tx,ty] or null
   */
  drawText?(left: number, top: number, right: number, bottom: number, text: string, fontSpec: any, direction: number, color: number, matrix: number[] | null): void;

  /**
   * Draw lines/polylines
   * @param points - Flat array of coordinates [x1,y1,x2,y2,...]
   * @param color - ARGB color value
   * @param width - Line width
   * @param closed - Whether to close the path
   */
  drawLines?(points: number[], color: number, width: number, closed: boolean): void;

  /**
   * Draw an image
   * @param left - Left coordinate
   * @param top - Top coordinate
   * @param right - Right coordinate
   * @param bottom - Bottom coordinate
   * @param name - Image name/path
   * @param method - Rendering method ("fit", "fill", etc)
   * @param capMask - Cap mask for image rendering
   */
  drawImage?(left: number, top: number, right: number, bottom: number, name: string, method: string, capMask: number): void;

  /**
   * Draw borders
   * @param left - Left coordinate
   * @param top - Top coordinate
   * @param right - Right coordinate
   * @param bottom - Bottom coordinate
   * @param lineWidth - Width array [top, right, bottom, left]
   * @param lineColor - Color array [top, right, bottom, left] (ARGB values)
   * @param lineStyle - Style array [top, right, bottom, left] ("solid", "dashed", etc)
   * @param radius - Corner radius array [topLeft, topRight, bottomRight, bottomLeft] or null
   */
  drawBorder?(left: number, top: number, right: number, bottom: number, lineWidth: number[], lineColor: number[], lineStyle: string[], radius: number[] | null): void;

  /**
   * Draw shadow
   * @param left - Left coordinate
   * @param top - Top coordinate
   * @param right - Right coordinate
   * @param bottom - Bottom coordinate
   * @param radius - Corner radius array [topLeft, topRight, bottomRight, bottomLeft] or null
   * @param offsetX - Shadow horizontal offset
   * @param offsetY - Shadow vertical offset
   * @param blurRadius - Shadow blur radius
   * @param spreadRadius - Shadow spread radius
   * @param color - ARGB color value
   */
  drawShadow?(left: number, top: number, right: number, bottom: number, radius: number[] | null, offsetX: number, offsetY: number, blurRadius: number, spreadRadius: number, color: number): void;
}

export interface SbmlRendererDelegateConstructor {
  new(impl: SbmlRendererDelegate): any;
  create(impl: Partial<SbmlRendererDelegate>): any;
  extend(name: string, methods: any): any;
}

/**
 * SbmlRenderer - Main renderer for compiled books
 */
export interface SbmlRenderer {
  drawPage(book: Book, pageIndex: number): void;
  delete(): void;
}

export interface SbmlRendererConstructor {
  new(delegate: any, fontFactory: any): SbmlRenderer;
}
