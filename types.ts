export type Alignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type ImportMode = 'full' | 'box';
export type BoxShape = 'none' | 'rect' | 'rounded' | 'oval'; 

export interface TextStyle {
  fontSize: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  color: string;
  backgroundColor?: string;
  boxShape?: BoxShape;
  alignment: Alignment; 
  verticalAlignment: VerticalAlignment; 
  textAlign: Alignment; // Baru: Untuk mengatur alur paragraf di dalam box (Left/Center/Right)
  outlineColor: string;
  outlineWidth: number;
  glowColor: string;
  glowBlur: number;
  glowOpacity: number;
  fontFamily: string;
  fontWeight?: string; // Fitur Baru: Bold Setting ('bold' | 'normal')
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
  type?: 'rect' | 'image'; // Membedakan manual vs smart bucket
  maskDataUrl?: string;    // URL gambar untuk smart bucket
  opacity?: number;  
  visible?: boolean; 
  shape?: 'rect' | 'oval'; // Fitur Baru: Pilihan Bentuk Manual
  stroke?: string;         // Fitur Baru: Warna Outline Masker
  strokeWidth?: number;    // Fitur Baru: Ketebalan Outline Masker
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