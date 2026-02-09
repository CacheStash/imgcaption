// FULL REWRITE - Menjaga konsistensi tipe data
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
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // pixels
}

export interface SavedStyle {
  id: string;
  name: string;
  style: TextStyle;
}

export interface Page {
  id: string;
  imageUrl: string;
  fileName: string;
  textObjects: TextObject[];
  isLocalStyle?: boolean;
  localStyle?: TextStyle;
}

export interface AppState {
  pages: Page[];
  hideLabels: boolean;
  importMode: ImportMode;
  selectedPageId: string | null;
  selectedTextId: string | null;
  isGalleryView: boolean;
  globalStyle: TextStyle;
  savedStyles: SavedStyle[];
}