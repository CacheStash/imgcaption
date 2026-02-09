import { TextObject, TextStyle, BubbleObject } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const FONT_OPTIONS = [
  { name: 'Formal', value: 'Inter' },
  { name: 'Casual', value: 'sans-serif' },
  { name: 'Fun', value: "'Comic Neue', cursive" },
  { name: 'Comic/Manga', value: "'Indie Flower', cursive" },
  { name: 'Action', value: 'Bangers' }
];

export const DEFAULT_STYLE: TextStyle = {
  fontSize: 24,
  color: '#000000',
  alignment: 'center',
  verticalAlign: 'top',
  outlineColor: '#ffffff',
  outlineWidth: 4,
  glowColor: '#ffffff',
  glowBlur: 10,
  glowOpacity: 0.8,
  fontFamily: "'Comic Neue', cursive",
  padding: 20,
  boxType: 'caption'
};

export const cleanText = (text: string, hideLabels: boolean): string => {
  if (!hideLabels) return text.trim();
  return text.replace(/^[^:]+:\s*/, '').trim();
};

export const createDefaultTextObject = (content: string, style: TextStyle): TextObject => ({
  id: generateId(),
  originalText: content,
  x: 50,
  y: 50,
  width: style.boxType === 'caption' ? 450 : 250,
  ...style
});

export const createDefaultBubble = (x: number, y: number): BubbleObject => ({
  id: generateId(),
  x,
  y,
  width: 150,
  height: 100,
  style: 'speech',
  tailPosition: { x: x + 20, y: y + 50 },
  backgroundColor: '#ffffff',
  borderColor: '#000000',
  borderWidth: 2
});

export const parseRawText = (text: string): Record<number, string[]> => {
  const result: Record<number, string[]> = {};
  const pageRegex = /Page\s+(\d+)\s*-\s*/gi;
  const sections = text.split(pageRegex);
  
  for (let i = 1; i < sections.length; i += 2) {
    const pageNum = parseInt(sections[i], 10);
    const content = (sections[i + 1] || '').trim();
    if (!content || content.toLowerCase().includes('[gak ada dialog]')) continue;

    const dialogues = content
      .split(/,\s*(?=[^:]+:)/) 
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    if (dialogues.length > 0) result[pageNum] = dialogues;
  }
  return result;
};