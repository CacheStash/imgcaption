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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onClearAll, onUpdateGlobalStyle
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);

  const updateGlobal = (updates: Partial<TextStyle>) => {
    onUpdateGlobalStyle({ ...state.globalStyle, ...updates });
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

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* NEW: General Settings Section */}
        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">General Settings</h3>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={state.hideLabels}
              onChange={(e) => setState(prev => ({ ...prev, hideLabels: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Hide Character Name</span>
          </label>
        </section>

        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Global Layout</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">H-Align</label>
                <select value={state.globalStyle.alignment} onChange={(e) => updateGlobal({ alignment: e.target.value as Alignment })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
                  <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">V-Align</label>
                <select value={state.globalStyle.verticalAlign} onChange={(e) => updateGlobal({ verticalAlign: e.target.value as VerticalAlignment })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
                  <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Safe Area</label>
                <input type="number" value={state.globalStyle.padding} onChange={(e) => updateGlobal({ padding: Number(e.target.value) })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-2" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Box Type</label>
                <select value={state.globalStyle.boxType} onChange={(e) => updateGlobal({ boxType: e.target.value as BoxType })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
                  <option value="caption">Full Width</option><option value="dialogue">Boxed</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Import Text</h3>
          <textarea placeholder="Page 1 - Lara: Dialog..." className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm outline-none resize-none" onBlur={(e) => onTextImport(e.target.value)} />
        </section>

        {selectedPage && (
          <section className="space-y-4">
            <button onClick={() => onAddText(selectedPage.id)} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">+ Add Text Box</button>
            {selectedText && (
              <div className="bg-slate-900 p-4 rounded-xl border border-blue-900/30">
                <textarea value={selectedText.originalText} onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm h-20 outline-none" />
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;