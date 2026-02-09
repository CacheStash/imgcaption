import React from 'react';
import { AppState, TextObject, Alignment, VerticalAlignment, BoxType, TextStyle } from '../types';
import { FONT_OPTIONS } from '../utils/helpers';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onTextImport: (text: string) => void;
  onUpdateText: (pageId: string, textId: string, updates: Partial<TextObject>) => void;
  onAddText: (pageId: string) => void;
  onClearAll: () => void;
  onUpdateGlobalStyle: (style: TextStyle) => void;
  onUpdatePageStyle: (style: TextStyle | undefined) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onClearAll, onUpdateGlobalStyle, onUpdatePageStyle
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);
  const isUsingOverride = !!selectedPage?.overrideStyle;
  const currentStyle = selectedPage?.overrideStyle || state.globalStyle;

  const handleStyleChange = (updates: Partial<TextStyle>) => {
    const newStyle = { ...currentStyle, ...updates };
    if (isUsingOverride) onUpdatePageStyle(newStyle);
    else onUpdateGlobalStyle(newStyle);
  };

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950 p-6 space-y-6 overflow-y-auto">
      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">ZenReader Pro</h1>

      {/* TYPOGRAPHY SECTION (RESTORED) */}
      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Typography</h3>
        <select value={currentStyle.fontFamily} onChange={(e) => handleStyleChange({ fontFamily: e.target.value })} className="w-full h-8 bg-slate-950 border border-slate-700 rounded text-xs px-2 outline-none">
          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="color" value={currentStyle.color} onChange={(e) => handleStyleChange({ color: e.target.value })} className="w-10 h-8 bg-transparent cursor-pointer" />
          <input type="number" value={currentStyle.fontSize} onChange={(e) => handleStyleChange({ fontSize: Number(e.target.value) })} className="flex-1 h-8 bg-slate-950 border border-slate-700 rounded text-xs px-2" />
        </div>
      </section>

      {/* OUTLINE & GLOW SECTION (RESTORED) */}
      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outline & Glow</h3>
        <div className="flex items-center gap-3">
          <input type="color" value={currentStyle.outlineColor} onChange={(e) => handleStyleChange({ outlineColor: e.target.value })} className="w-6 h-6 bg-transparent" />
          <input type="range" min="0" max="15" value={currentStyle.outlineWidth} onChange={(e) => handleStyleChange({ outlineWidth: Number(e.target.value) })} className="flex-1" />
        </div>
        <div className="flex items-center gap-3">
          <input type="color" value={currentStyle.glowColor} onChange={(e) => handleStyleChange({ glowColor: e.target.value })} className="w-6 h-6 bg-transparent" />
          <input type="range" min="0" max="30" value={currentStyle.glowBlur} onChange={(e) => handleStyleChange({ glowBlur: Number(e.target.value) })} className="flex-1" />
        </div>
      </section>

      {/* SMART RE-FILL MASK COLOR */}
      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase">Balloon Mask Color</h3>
        <div className="flex items-center gap-3">
          <input type="color" value={currentStyle.textBackgroundColor} onChange={(e) => handleStyleChange({ textBackgroundColor: e.target.value })} className="w-8 h-8 bg-transparent" />
          <button onClick={() => handleStyleChange({ textBackgroundColor: 'transparent' })} className="text-[9px] text-blue-400 underline">Clear</button>
        </div>
      </section>

      {/* LAYOUT EDITOR */}
      <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <select value={currentStyle.alignment} onChange={(e) => handleStyleChange({ alignment: e.target.value as Alignment })} className="h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          <select value={currentStyle.verticalAlign} onChange={(e) => handleStyleChange({ verticalAlign: e.target.value as VerticalAlignment })} className="h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
            <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900/40 rounded-lg border border-slate-800">
          <input type="checkbox" checked={state.hideLabels} onChange={(e) => setState(p => ({ ...p, hideLabels: e.target.checked }))} className="w-4 h-4" />
          <span className="text-xs text-slate-300">Hide Character Name</span>
        </label>
        {selectedPage && (
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-900/10 rounded-lg border border-blue-900/30">
            <input type="checkbox" checked={isUsingOverride} onChange={(e) => onUpdatePageStyle(e.target.checked ? state.globalStyle : undefined)} className="w-4 h-4" />
            <span className="text-xs text-blue-400 font-bold">Override Style This Page</span>
          </label>
        )}
      </section>

      <textarea placeholder="Import Text..." className="w-full h-32 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs outline-none" onBlur={(e) => onTextImport(e.target.value)} />
    </aside>
  );
};

export default Sidebar;