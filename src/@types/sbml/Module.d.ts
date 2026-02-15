/**
 * Main SBML module interface
 */

import type { SizeConstructor, PointConstructor, RectConstructor, ScreenSpecConstructor } from "./Geometry.js";
import type { PropMapConstructor } from "./PropMap.js";
import type { BonParserConstructor, BonWriterConstructor, BonValue, BonMap, BonArray } from "./Bon.js";
import type { SbmlParserConstructor } from "./Parser.js";
import type { SbmlCompilerConstructor } from "./Compiler.js";
import type { SbmlRendererConstructor, SbmlRendererDelegateConstructor } from "./Renderer.js";
import type { SbmlBookConstructor, SbmlBookLayout } from "./Book.js";
import type {
  SbmlFontSpecConstructor,
  SbmlFontFactoryConstructor,
  SbmlFontFactoryImplConstructor,
} from "./Font.js";
import type { SbmlImageRegistryConstructor, SbmlImageSpecType } from "./Image.js";
import type { SbmlObjectHelperConstructor } from "./Object.js";
import type { SbmlSelectionConstructor } from "./Selection.js";
import type { LoggerConstructor } from "./Logger.js";
import type { SbmlFingerprint } from "./Fingerprint.js";

/**
 * Main SBML module interface
 * Emscripten-compiled WebAssembly module with all exported types
 */
export interface SbmlModule {
  // Emscripten runtime configuration
  locateFile?: (path: string) => string;
  onRuntimeInitialized?: () => void;

  // Geometry types
  Size: SizeConstructor;
  Point: PointConstructor;
  Rect: RectConstructor;

  // Core types
  PropMap: PropMapConstructor;
  ScreenSpec: ScreenSpecConstructor;

  // Compilation
  SbmlCompiler: SbmlCompilerConstructor;

  // Rendering
  SbmlRenderer: SbmlRendererConstructor;
  SbmlRendererDelegate: SbmlRendererDelegateConstructor;

  // Font system
  SbmlFontSpec: SbmlFontSpecConstructor;
  SbmlFontFactory: SbmlFontFactoryConstructor;
  SbmlFontFactoryImpl: SbmlFontFactoryImplConstructor;

  // Image system
  SbmlImageRegistry: SbmlImageRegistryConstructor;
  SbmlImageSpec: SbmlImageSpecType;

  // Object helpers
  ObjectHelper: SbmlObjectHelperConstructor;

  // BON Parser, Writer and types
  BonParser: BonParserConstructor;
  BonWriter: BonWriterConstructor;
  BonValue: { new(): BonValue };
  BonMap: { new(): BonMap; fromObject(js_value: Record<string, any>): BonMap | null };
  BonArray: { new(): BonArray };

  // SBML Parser
  SbmlParser: SbmlParserConstructor;

  // Book
  SbmlBook: SbmlBookConstructor;
  SbmlBookLayout: { new(): SbmlBookLayout };

  // Selection
  SbmlSelection: SbmlSelectionConstructor;

  // Fingerprint
  SbmlFingerprint: SbmlFingerprint;

  // Logging
  Logger: LoggerConstructor;
}

/**
 * Initialize the SBML module
 * Returns a promise that resolves to the initialized module
 */
declare function loadSbmlModule(): Promise<SbmlModule>;

export default loadSbmlModule;
