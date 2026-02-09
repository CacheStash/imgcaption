import React from 'react';
import { AppState, TextObject, Alignment, VerticalAlignment, BoxType, TextStyle } from '../types';
import { FONT_OPTIONS, autoWrapText } from '../utils/helpers';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onTextImport: (text: string) => void;
  onUpdateText: (pageId: string, textId: string, updates: Partial<TextObject>) => void;
  onAddText: (pageId: string) => void;
  onClearAll: () => void;
  onUpdateGlobalStyle: (style: TextStyle) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onClearAll, onUpdateGlobalStyle
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);

  const updateGlobal = (updates: Partial<TextStyle>) => {
    onUpdateGlobalStyle({ ...state.globalStyle, ...updates });
  };

  const renderGlobalStyleEditor = (style: TextStyle) => {
    return (
      <div className="space-y-4">
        {/* Layout Row */}
        <div className="border-b border-slate-800 pb-4 mb-4">
          <label className="block text-[10px] text-blue-400 mb-2 font-bold uppercase tracking-widest">Layout & Box</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[9px] text-slate-500 mb-1">H-Align</label>
              <select 
                value={style.alignment}
                onChange={(e) => updateGlobal({ alignment: e.target.value as Alignment })}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 mb-1">V-Align</label>
              <select 
                value={style.verticalAlign}
                onChange={(e) => updateGlobal({ verticalAlign: e.target.value as VerticalAlignment })}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1"
              >
                <option value="top">Top (Stack)</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] text-slate-500 mb-1">Safe Area (px)</label>
              <input 
                type="number" value={style.padding}
                onChange={(e) => updateGlobal({ padding: Number(e.target.value) })}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-2"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 mb-1">Box Type</label>
              <select 
                value={style.boxType}
                onChange={(e) => updateGlobal({ boxType: e.target.value as BoxType })}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1"
              >
                <option value="caption">Full Width</option>
                <option value="dialogue">Boxed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Text Style Row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Color</label>
            <input 
              type="color" value={style.color}
              onChange={(e) => updateGlobal({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer bg-slate-900 border border-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Font</label>
            <select 
              value={style.fontFamily}
              onChange={(e) => updateGlobal({ fontFamily: e.target.value })}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1"
            >
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Size</label>
            <input 
              type="number" value={style.fontSize}
              onChange={(e) => updateGlobal({ fontSize: Number(e.target.value) })}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-2"
            />
          </div>
          <div className="flex flex-col justify-end pb-1">
             <span className="text-[9px] text-slate-600 italic">Auto-stacks enabled</span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase">Outline</label>
          <div className="flex gap-2">
            <input 
              type="color" value={style.outlineColor}
              onChange={(e) => updateGlobal({ outlineColor: e.target.value })}
              className="w-10 h-8 rounded cursor-pointer bg-slate-900 border border-slate-700"
            />
            <input 
              type="range" min="0" max="15" step="1" value={style.outlineWidth}
              onChange={(e) => updateGlobal({ outlineWidth: Number(e.target.value) })}
              className="flex-1 accent-blue-500"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          ZenReader Pro
        </h1>
        <button onClick={onClearAll} className="p-2 hover:bg-red-900/20 text-slate-600 hover:text-red-500 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Global Configuration</h3>
          {renderGlobalStyleEditor(state.globalStyle)}
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Import Text</h3>
          <textarea 
            placeholder="Page 1 - Text..."
            className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            onBlur={(e) => onTextImport(e.target.value)}
          />
        </section>

        {selectedPage && (
          <section className="animate-in fade-in slide-in-from-left-2">
            <button onClick={() => onAddText(selectedPage.id)} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm mb-4 transition-colors">
              + Add Text Box
            </button>
            {selectedText && (
              <div className="bg-slate-900 p-4 rounded-xl border border-blue-900/30">
                <textarea 
                  value={selectedText.originalText}
                  onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm h-20 outline-none"
                />
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;