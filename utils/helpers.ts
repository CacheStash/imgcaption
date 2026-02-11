import { TextObject, TextStyle, Alignment, VerticalAlignment, ImportMode } from '../types';

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
  // FIX: Regex untuk menghapus label "Nama:" di awal string, awal baris baru, atau setelah tanda koma
  return text.replace(/(?:\r?\n|^|,\s*)[^:\n,]+:\s*/g, (match) => {
    return match.startsWith(',') ? ', ' : '';
  }).trim();
};

export const parseRawText = (text: string, mode: ImportMode = 'box'): Record<number, string[]> => {
  const result: Record<number, string[]> = {};
  const pageRegex = /Page\s+(\d+)\s*-\s*/gi;
  const sections = text.split(pageRegex);
  for (let i = 1; i < sections.length; i += 2) {
    const pageNum = parseInt(sections[i], 10);
    let content = (sections[i + 1] || '').trim();
    if (content.toLowerCase().includes('[gak ada dialog]') || content.toLowerCase().includes('[halaman statis]')) continue;
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) result[pageNum] = [lines.join('\n')];
  }
  return result;
};

export const getPosFromAlign = (align: Alignment, vAlign: VerticalAlignment, mode: ImportMode) => {
  if (mode === 'full') return { x: 50, y: 85 };
  let x = 50, y = 50;
  if (align === 'left') x = 20; if (align === 'right') x = 80;
  if (vAlign === 'top') y = 15; if (vAlign === 'bottom') y = 85;
  return { x, y };
};

export const createDefaultTextObject = (content: string, style: TextStyle, mode: ImportMode = 'box'): TextObject => {
  const { x, y } = getPosFromAlign(style.alignment, style.verticalAlignment, mode);
  return { id: generateId(), originalText: content, x, y, width: mode === 'full' ? 700 : 400, ...style };
};

export const DEFAULT_STYLE: TextStyle = {
  fontSize: 24,
  paddingTop: 15,
  paddingRight: 15,
  paddingBottom: 15,
  paddingLeft: 15,
  color: '#ffffff',
  backgroundColor: '#000000', 
  boxShape: 'none',           
  alignment: 'center',
  verticalAlignment: 'middle',
  outlineColor: '#000000',
  outlineWidth: 4,
  glowColor: '#ffffff',
  glowBlur: 0,
  glowOpacity: 0.5,
  fontFamily: "'Comic Neue', cursive"
};