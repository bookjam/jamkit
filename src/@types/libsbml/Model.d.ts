/**
 * Document model types
 */

/**
 * SbmlNode - Node in the SBML document tree
 */
export interface SbmlNode {
  // Node comparison and hierarchy
  equals(other: SbmlNode): boolean;
  getParent(): number | null;
  getDocument(): number | null;

  // Node properties
  getOffset(): number;
  getVolume(): number;
}

/**
 * SbmlTextNode - Text content node
 * Extends SbmlNode
 */
export interface SbmlTextNode extends SbmlNode {
  getText(): string;
}

/**
 * SbmlElementNode - Element node with attributes
 * Extends SbmlNode
 */
export interface SbmlElementNode extends SbmlNode {
  getTagName(): string;
  getAttributes(): any;
  getAttribute(name: string): string;
  hasAttribute(name: string): boolean;
}

/**
 * SbmlObjectNode - Object node
 * Extends SbmlElementNode
 */
export interface SbmlObjectNode extends SbmlElementNode {
  getObjectType(): string;
}

/**
 * SbmlSectionNode - Section node
 * Extends SbmlElementNode
 * Contains methods for accessing section properties and child nodes
 */
export interface SbmlSectionNode extends SbmlElementNode {
  // Section properties
  getId(): string;
  getTitle(): string;
  getLevel(): number;

  // Text access
  getText(): string;

  // Child node access
  getChildNodeCount(): number;
  getChildNodeAt(index: number): SbmlNode | null;

  // Child section access
  getChildSectionCount(): number;
  getChildSectionAt(index: number): SbmlSectionNode | null;

  // Hierarchy
  isAncestorOf(node: SbmlNode): boolean;

  // Property access (alias for getAttribute for consistency with Android/iOS APIs)
  getProperty(key: string): string | null;

  // Deep property access (searches up the section hierarchy)
  getDeepProperty(key: string): string | null;

  // Get associated document
  getDocument(): SbmlDocument;
}

/**
 * SbmlDocument - Parsed SBML document
 * Returned by SbmlParser.parseFiles()
 * Contains the document structure before compilation
 * Extends SbmlSectionNode (the document itself is the root section)
 */
export interface SbmlDocument extends SbmlSectionNode {
  // Document volume and text methods
  getVolume(): number;
  getTextAtLocation(offset: number, length: number): string;

  // Section finding methods (returns SbmlSectionNode)
  findSectionById(id: string): SbmlSectionNode | null;
  findSectionForKey(key: string, type: string): SbmlSectionNode | null;
  findSectionByPath(path: string): SbmlSectionNode | null;
  getAllSections(): SbmlSectionNode[];

  // Maps
  getAnchorMap(): any;
  getIndexMap(): any;
  getStyleMap(): any;

  // Styles
  getOrderedStyleNames(): string[];
  getStyleLocation(styleName: string): number;

  // Node methods (returns the document itself as it is the root)
  getRootNode(): SbmlDocument;

  // Properties
  getProperty(key: string | null): string;
  getAllProperties(): any;

  // Cleanup
  delete(): void;
}
