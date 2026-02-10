// types.ts
export type Alignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type ImportMode = 'full' | 'box';

export interface TextStyle {
  fontSize: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  color: string;
  alignment: Alignment;
  verticalAlignment: VerticalAlignment;
  outlineColor: string;
  outlineWidth: number;
  glowColor: string;
  glowBlur: number;
  glowOpacity: number;
  fontFamily: string;
}

export interface TextObject extends TextStyle {
  id: string;
  originalText: string;
  x: number;
  y: number;
  width: number;
}

// Fitur Baru: Mask untuk menimpa dialog lama
export interface MaskObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface Page {
  id: string;
  imageUrl: string;
  fileName: string;
  textObjects: TextObject[];
  masks?: MaskObject[]; // Tambahan array mask
  isLocalStyle?: boolean;
  localStyle?: TextStyle;
}

export interface AppState {
  pages: Page[];
  hideLabels: boolean;
  importMode: ImportMode;
  selectedPageId: string | null;
  selectedTextId: string | null;
  selectedMaskId?: string | null; // Track mask yang dipilih
  isGalleryView: boolean;
  globalStyle: TextStyle;
  savedStyles: SavedStyle[];
}

export interface SavedStyle {
  id: string;
  name: string;
  style: TextStyle;
}