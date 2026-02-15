/**
 * Image system types
 */

/**
 * SbmlImageSpec - Device-specific image variant specification
 */
export interface SbmlImageSpec {
  name: string;
  scale: number;
}

export interface SbmlImageSpecType {
  new(name: string, scale: number): SbmlImageSpec;
}

/**
 * SbmlImageRegistry - Device-specific image selection
 */
export interface SbmlImageRegistry {
  addFileName(fileName: string): void;
  selectImage(imageName: string, targetSuffix: number[]): SbmlImageSpec | null;
  reset(): void;
  delete(): void;
}

export interface SbmlImageRegistryConstructor {
  new(fileNames: string[]): SbmlImageRegistry;
}
