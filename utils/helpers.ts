import { TextObject, TextStyle, BubbleObject } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const FONT_OPTIONS = [
  { name: 'Formal', value: 'Inter' },
  { name: 'Casual', value: 'sans-serif' },
  { name: 'Fun', value: "'Comic Neue', cursive" },
  { name: 'Comic/Manga', value: "'Indie Flower', cursive" },
  { name: 'Action', value: 'Bangers' }
];

export const cleanText = (text: string, hideLabels: boolean): string => {
  if (!hideLabels) return text.trim();
  return text.replace(/^[^:]+:\s*/, '').trim();
};

export const autoWrapText = (text: string, maxCharsPerLine: number = 25): string => {
  const words = text.split(' ');
  let wrapped = '';
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > maxCharsPerLine) {
      wrapped += currentLine.trim() + '\n';
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  wrapped += currentLine.trim();
  return wrapped;
};

export const parseRawText = (text: string): Record<number, string[]> => {
  const result: Record<number, string[]> = {};
  const pageRegex = /Page\s+(\d+)\s*-\s*/gi;
  const sections = text.split(pageRegex);
  
  for (let i = 1; i < sections.length; i += 2) {
    const pageNum = parseInt(sections[i], 10);
    const content = (sections[i + 1] || '').trim();
    
    if (
      content.toLowerCase().includes('[gak ada dialog]') || 
      content.toLowerCase().includes('[halaman statis]')
    ) {
      continue;
    }

    const dialogues = content
      .split(/,\s*(?=[^:]+:)/) 
      .map(d => d.trim())
      .filter(d => d.length > 0 && !d.toLowerCase().startsWith('page'));
    
    if (dialogues.length > 0) {
      result[pageNum] = dialogues;
    }
  }
  
  return result;
};

export const createDefaultTextObject = (content: string, style: TextStyle): TextObject => ({
  id: generateId(),
  originalText: content,
  x: 50,
  y: 50,
  width: 250,
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

export const DEFAULT_STYLE: TextStyle = {
  fontSize: 24,
  color: '#000000',
  alignment: 'center',
  outlineColor: '#ffffff',
  outlineWidth: 4,
  glowColor: '#ffffff',
  glowBlur: 10,
  glowOpacity: 0.8,
  fontFamily: "'Comic Neue', cursive"
};