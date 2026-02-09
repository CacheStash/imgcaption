export type Alignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type BoxType = 'caption' | 'dialogue';

export interface TextStyle {
  fontSize: number;
  color: string;
  alignment: Alignment;
  verticalAlign: VerticalAlignment;
  outlineColor: string;
  outlineWidth: number;
  glowColor: string;
  glowBlur: number;
  glowOpacity: number;
  fontFamily: string;
  padding: number;
  boxType: BoxType;
  textBackgroundColor: string; // FITUR PENIMPA BALON
}

export interface TextObject extends TextStyle {
  id: string;
  originalText: string;
  x: number; 
  y: number; 
  width: number; 
}

export interface BubbleObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: 'speech' | 'thought' | 'scream' | 'square';
  tailPosition: { x: number; y: number };
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface Page {
  id: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  textObjects: TextObject[];
  bubbles: BubbleObject[];
  overrideStyle?: TextStyle;
}

export interface AppState {
  pages: Page[];
  hideLabels: boolean;
  selectedPageId: string | null;
  selectedTextId: string | null;
  selectedBubbleId: string | null;
  isGalleryView: boolean;
  globalStyle: TextStyle;
  savedStyles: { id: string; name: string; style: TextStyle }[];
}