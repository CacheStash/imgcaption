import { TextObject, TextStyle, BubbleObject } from '../types'; // FIXED PATH

export const generateId = () => Math.random().toString(36).substr(2, 9);

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
  return text
    .replace(/Page\s+\d+\s*-\s*/gi, '')
    .replace(/(?:^|,\s*)[^:]+:\s*/g, (match) => match.startsWith(',') ? ', ' : '')
    .trim();
};

// FITUR BARU: Logika pemecah teks berdasarkan Nama Karakter
export const parseRawText = (text: string): Record<number, string[]> => {
  const result: Record<number, string[]> = {};
  const pageRegex = /Page\s+(\d+)\s*-\s*/gi;
  const sections = text.split(pageRegex);
  
  for (let i = 1; i < sections.length; i += 2) {
    const pageNum = parseInt(sections[i], 10);
    const content = (sections[i + 1] || '').trim();
    if (!content || content.toLowerCase().includes('[gak ada dialog]')) continue;

    // Memecah dialog jika ada pola ", Nama:"
    const dialogues = content
      .split(/,\s*(?=[^:]+:)/g)
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    if (dialogues.length > 0) result[pageNum] = dialogues;
  }
  return result;
};

export const createDefaultTextObject = (content: string, style: TextStyle): TextObject => ({
  id: generateId(),
  originalText: content,
  x: 50,
  y: 50,
  width: style.boxType === 'caption' ? 500 : 280,
  ...style
});

export const FONT_OPTIONS = [
  { name: 'Formal', value: 'Inter' },
  { name: 'Casual', value: 'sans-serif' },
  { name: 'Fun', value: "'Comic Neue', cursive" },
  { name: 'Comic/Manga', value: "'Indie Flower', cursive" },
  { name: 'Action', value: 'Bangers' }
];