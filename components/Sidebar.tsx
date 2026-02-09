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

      {/* TYPOGRAPHY */}
      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase">Typography</h3>
        <select value={currentStyle.fontFamily} onChange={(e) => handleStyleChange({ fontFamily: e.target.value })} className="w-full h-8 bg-slate-950 border border-slate-700 rounded text-xs px-2">
          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="color" value={currentStyle.color} onChange={(e) => handleStyleChange({ color: e.target.value })} className="w-10 h-8 bg-transparent cursor-pointer" />
          <input type="number" value={currentStyle.fontSize} onChange={(e) => handleStyleChange({ fontSize: Number(e.target.value) })} className="flex-1 h-8 bg-slate-950 border border-slate-700 rounded text-xs px-2" />
        </div>
      </section>

      {/* SMART BALLOON RE-FILL */}
      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase">Smart Balloon Re-fill</h3>
        <div className="flex items-center gap-3">
          <input type="color" value={currentStyle.textBackgroundColor} onChange={(e) => handleStyleChange({ textBackgroundColor: e.target.value })} className="w-8 h-8 bg-transparent" />
          <span className="text-xs text-slate-300">Mask Color</span>
          <button onClick={() => handleStyleChange({ textBackgroundColor: 'transparent' })} className="text-[9px] text-blue-400 underline ml-auto">Clear</button>
        </div>
      </section>

      {/* LAYOUT */}
      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <select value={currentStyle.alignment} onChange={(e) => handleStyleChange({ alignment: e.target.value as Alignment })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px]">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          <select value={currentStyle.verticalAlign} onChange={(e) => handleStyleChange({ verticalAlign: e.target.value as VerticalAlignment })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px]">
            <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={currentStyle.padding} onChange={(e) => handleStyleChange({ padding: Number(e.target.value) })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px] px-2" placeholder="Safe Area" />
          <select value={currentStyle.boxType} onChange={(e) => handleStyleChange({ boxType: e.target.value as BoxType })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px]">
            <option value="caption">Full Width</option><option value="dialogue">Boxed</option>
          </select>
        </div>
      </section>

      {selectedPage && (
        <label className="flex items-center gap-3 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg cursor-pointer">
          <input type="checkbox" checked={isUsingOverride} onChange={(e) => onUpdatePageStyle(e.target.checked ? state.globalStyle : undefined)} className="w-4 h-4" />
          <span className="text-xs text-blue-400 font-bold">Custom Style Page</span>
        </label>
      )}

      <textarea placeholder="Import Text (Page 1 - Dialog...)" className="w-full h-32 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs outline-none" onBlur={(e) => onTextImport(e.target.value)} />
    </aside>
  );
};

export default Sidebar;