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
  onExport: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onClearAll, onUpdateGlobalStyle, onUpdatePageStyle, onExport 
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const isUsingOverride = !!selectedPage?.overrideStyle;
  const currentStyle = selectedPage?.overrideStyle || state.globalStyle;

  const handleStyleChange = (updates: Partial<TextStyle>) => {
    const newStyle = { ...currentStyle, ...updates };
    if (isUsingOverride) onUpdatePageStyle(newStyle);
    else onUpdateGlobalStyle(newStyle);
  };

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950 p-6 space-y-6 overflow-y-auto">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">ZenReader Pro</h1>
          <button onClick={onClearAll} className="p-2 text-slate-600 hover:text-red-500 transition-colors text-xs font-bold">RESET</button>
        </div>

        <button 
          onClick={onExport}
          disabled={state.pages.length === 0}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span>🖼️</span> EXPORT ZIP (IMAGES)
        </button>
      </div>

      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Typography</h3>
        <select value={currentStyle.fontFamily} onChange={(e) => handleStyleChange({ fontFamily: e.target.value })} className="w-full h-8 bg-slate-950 border border-slate-700 rounded text-xs px-2 outline-none text-white">
          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="color" value={currentStyle.color} onChange={(e) => handleStyleChange({ color: e.target.value })} className="w-10 h-8 bg-transparent border-none cursor-pointer" />
          <input type="number" value={currentStyle.fontSize} onChange={(e) => handleStyleChange({ fontSize: Number(e.target.value) })} className="flex-1 h-8 bg-slate-950 border border-slate-700 rounded text-xs px-2 text-white" />
        </div>
      </section>

      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
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

      <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Layout & Padding</h3>
        <div className="grid grid-cols-2 gap-2">
          <select value={currentStyle.alignment} onChange={(e) => handleStyleChange({ alignment: e.target.value as Alignment })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px] px-1 text-white">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          <select value={currentStyle.verticalAlign} onChange={(e) => handleStyleChange({ verticalAlign: e.target.value as VerticalAlignment })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px] px-1 text-white">
            <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={currentStyle.padding} onChange={(e) => handleStyleChange({ padding: Number(e.target.value) })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px] px-2 text-white" placeholder="Padding" />
          <select value={currentStyle.boxType} onChange={(e) => handleStyleChange({ boxType: e.target.value as BoxType })} className="h-8 bg-slate-950 border border-slate-700 rounded text-[10px] px-1 text-white">
            <option value="caption">Full Width</option><option value="dialogue">Boxed</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900/40 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors">
          <input type="checkbox" checked={state.hideLabels} onChange={(e) => setState(p => ({ ...p, hideLabels: e.target.checked }))} className="w-4 h-4 rounded border-slate-700 bg-slate-900" />
          <span className="text-xs text-slate-300">Hide Character Name</span>
        </label>
        {selectedPage && (
          <label className="flex items-center gap-3 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg cursor-pointer hover:bg-blue-900/20 transition-colors">
            <input type="checkbox" checked={isUsingOverride} onChange={(e) => onUpdatePageStyle(e.target.checked ? state.globalStyle : undefined)} className="w-4 h-4" />
            <span className="text-xs text-blue-400 font-bold">Custom Style Page</span>
          </label>
        )}
      </section>

      <section>
        <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Import Text</h3>
        <textarea placeholder="Page 1 - Dialog..." className="w-full h-32 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-shadow" onBlur={(e) => onTextImport(e.target.value)} />
      </section>
    </aside>
  );
};

export default Sidebar;