export type Alignment = 'left' | 'center' | 'right';

export interface TextStyle {
  fontSize: number;
  color: string;
  alignment: Alignment;
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

// Tambahan untuk Speech Bubble
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
  bubbles: BubbleObject[]; // Tambahkan ini
}

export interface AppState {
  pages: Page[];
  hideLabels: boolean;
  selectedPageId: string | null;
  selectedTextId: string | null;
  selectedBubbleId: string | null; // Tambahkan tracking untuk balon
  isGalleryView: boolean;
  globalStyle: TextStyle;
  savedStyles: SavedStyle[];
}