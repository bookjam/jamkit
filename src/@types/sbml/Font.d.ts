/**
 * Font system types
 */

/**
 * SbmlFontWeight - Font weight enumeration
 * SbmlFontStyle - Font style enumeration
 * Actual implementation is in Font.ts
 */
export { SbmlFontWeight, SbmlFontStyle } from "../src/Font.js";

/**
 * SbmlFont - Font object with metrics
 * Created by SbmlFontFactory
 */
export interface SbmlFont {
  readonly ascent: number;
  readonly descent: number;
  readonly lineHeight: number;
  advanceOfCharacter(ch: number): number;
  measureText(text: string): number;
  delete(): void;
}

/**
 * SbmlFontSpec - Font specification
 */
export interface SbmlFontSpec {
  family: string;
  size: number;
  weight: number; // SbmlFontWeight
  style: number; // SbmlFontStyle
  noScale: boolean;
}

export interface SbmlFontSpecConstructor {
  new(): SbmlFontSpec;
}

/**
 * SbmlFontFactory - Factory for creating fonts
 */
export interface SbmlFontFactory {
  readonly baseSize: number;
  readonly fontScale: number;
  delete(): void;
}

export interface SbmlFontFactoryConstructor {
  new(baseSize: number, fontScale: number, impl: SbmlFontFactoryImpl): SbmlFontFactory;
  create(baseSize: number, fontScale: number, impl: SbmlFontFactoryImpl): SbmlFontFactory;
}

/**
 * SbmlFontFactoryImpl - JavaScript implementation interface
 * Provide font creation primitives for platform-specific fonts
 */
export interface SbmlFontFactoryImpl {
  createFont(family: string, size: number, weight: number, style: number): any;
}

export interface SbmlFontFactoryImplConstructor {
  new(impl: SbmlFontFactoryImpl): any;
  extend(name: string, methods: any): any;
}
