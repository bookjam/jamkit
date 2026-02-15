/**
 * PropMap types for key-value storage
 */

/**
 * PropMapKeyIterator - Iterator for PropMap keys
 */
export interface PropMapKeyIterator {
  hasNext(): boolean;
  next(): string;
}

/**
 * PropMap - Property map for storing key-value pairs
 * Note: Similar to Java's HashMap or JavaScript's Map
 */
export interface PropMap {
  // Get value by key
  get(key: string | null): string;
  get(key: string | null, defaultValue: string): string;

  // Put key-value pair
  put(key: string | null, value: string): void;

  // Put all entries from an object
  putAll(map: { [key: string]: string }): void;

  // Get key iterator
  keyIterator(): PropMapKeyIterator;

  // Delete
  delete(): void;
}

export interface PropMapConstructor {
  new(): PropMap;
}
