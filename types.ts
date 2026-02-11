export type Alignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type ImportMode = 'full' | 'box';
// Fitur Baru: Pilihan bentuk dialog box
export type BoxShape = 'none' | 'rect' | 'rounded' | 'oval'; 

export interface TextStyle {
  fontSize: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  color: string;
  backgroundColor?: string; // Fitur Baru: Warna latar dialog
  boxShape?: BoxShape;      // Fitur Baru: Bentuk dialog
  alignment: Alignment; 
  verticalAlignment: VerticalAlignment; 
  outlineColor: string;
  outlineWidth: number;
  glowColor: string;
  glowBlur: number;
  glowOpacity: number;
  fontFamily: string;
  type?: 'rect' | 'image'; // Fitur Baru: Membedakan kotak manual vs smart fill
  maskDataUrl?: string;    // Fitur Baru: Menyimpan gambar hasil paint bucket
}

export interface AppState {
  pages: Page[];
  hideLabels: boolean;
  importMode: ImportMode;
  selectedPageId: string | null;
  selectedTextId: string | null;
  selectedMaskId?: string | null;
  isGalleryView: boolean;
  globalStyle: TextStyle;
  savedStyles: SavedStyle[];
  isSmartFillMode?: boolean; // Fitur Baru: Toggle mode paint bucket
  
}

export interface TextObject extends TextStyle {
  id: string;
  originalText: string;
  x: number; 
  y: number; 
  width: number; 
  visible?: boolean; 
}

export interface MaskObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  type?: 'rect' | 'image';
  maskDataUrl?: string;
  opacity?: number;  
  visible?: boolean; 
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
  masks?: MaskObject[]; 
  isLocalStyle?: boolean;
  localStyle?: TextStyle;
  importMode?: ImportMode;
}

export interface AppState {
  pages: Page[];
  hideLabels: boolean;
  importMode: ImportMode;
  selectedPageId: string | null;
  selectedTextId: string | null;
  selectedMaskId?: string | null;
  isGalleryView: boolean;
  globalStyle: TextStyle;
  savedStyles: SavedStyle[];
  isSmartFillMode?: boolean; 
}