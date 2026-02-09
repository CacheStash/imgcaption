export type Alignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type BoxType = 'caption' | 'dialogue';

export interface TextStyle {
  fontSize: number;
  color: string;
  alignment: Alignment;
  verticalAlign: VerticalAlignment; // Untuk posisi vertikal global
  outlineColor: string;
  outlineWidth: number;
  glowColor: string;
  glowBlur: number;
  glowOpacity: number;
  fontFamily: string;
  padding: number;       // Safe area/margin dari pinggir gambar
  boxType: BoxType;      // Tipe box: panjang (caption) atau kotak (dialogue)
}

export interface TextObject extends TextStyle {
  id: string;
  originalText: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // pixels
}

export type BubbleStyle = 'speech' | 'thought' | 'scream' | 'square';

export interface BubbleObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: BubbleStyle;
  tailPosition: { x: number; y: number };
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
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
  bubbles: BubbleObject[];
}

export interface AppState {
  pages: Page[];
  hideLabels: boolean;
  selectedPageId: string | null;
  selectedTextId: string | null;
  selectedBubbleId: string | null;
  isGalleryView: boolean;
  globalStyle: TextStyle;
  savedStyles: SavedStyle[];
}