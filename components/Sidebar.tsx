
import React from 'react';
import { AppState, TextObject, Alignment, TextStyle } from '../types';
import { generateId, FONT_OPTIONS, autoWrapText } from '../utils/helpers';

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
  state, 
  setState, 
  onTextImport, 
  onUpdateText,
  onAddText,
  onClearAll,
  onUpdateGlobalStyle
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);

  const applySavedStyle = (style: TextStyle) => {
    onUpdateGlobalStyle(style);
  };

  const updateGlobal = (updates: Partial<TextStyle>) => {
    onUpdateGlobalStyle({ ...state.globalStyle, ...updates });
  };

  const renderGlobalStyleEditor = (style: TextStyle) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Text Color</label>
            <input 
              type="color" value={style.color}
              onChange={(e) => updateGlobal({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer bg-slate-900 border border-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Font Type</label>
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
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Align</label>
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
        </div>

        <div className="border-t border-slate-800 pt-4">
          <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase">Outline</label>
          <div className="flex gap-2 mb-2">
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

        <div className="border-t border-slate-800 pt-4">
          <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase">Outer Glow</label>
          <input 
            type="color" value={style.glowColor}
            onChange={(e) => updateGlobal({ glowColor: e.target.value })}
            className="w-full h-6 rounded cursor-pointer bg-slate-900 border border-slate-700 mb-2"
          />
          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Blur: {style.glowBlur}</span>
                <input 
                  type="range" min="0" max="100" step="1" value={style.glowBlur}
                  onChange={(e) => updateGlobal({ glowBlur: Number(e.target.value) })}
                  className="w-2/3 accent-indigo-500"
                />
             </div>
             <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Opac: {style.glowOpacity}</span>
                <input 
                  type="range" min="0" max="1" step="0.1" value={style.glowOpacity}
                  onChange={(e) => updateGlobal({ glowOpacity: Number(e.target.value) })}
                  className="w-2/3 accent-indigo-500"
                />
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Comic Editor
        </h1>
        <button 
          onClick={onClearAll}
          className="p-2 hover:bg-red-900/20 text-slate-600 hover:text-red-500 rounded-lg transition-colors"
          title="Clear All Data"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* General Settings Toggle */}
        <section className="bg-blue-900/10 p-4 rounded-xl border border-blue-900/30">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-4">General Settings</h3>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={state.hideLabels}
                onChange={(e) => setState(prev => ({ ...prev, hideLabels: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Hide Character Labels</span>
          </label>
        </section>

        {/* Global Configuration */}
        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Global Style (Applied to All)</h3>
          {renderGlobalStyleEditor(state.globalStyle)}
        </section>

        {/* Style Presets */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Saved Presets</h3>
          <div className="grid grid-cols-2 gap-2">
            {state.savedStyles.map(s => (
              <button 
                key={s.id}
                onClick={() => applySavedStyle(s.style)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 hover:bg-slate-700 hover:border-blue-500 transition-all truncate"
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>

        {/* Text Import */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Import Text</h3>
          <textarea 
            placeholder="Page 82 - Name: Dialogue, Name: Dialogue..."
            className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-slate-600"
            onBlur={(e) => onTextImport(e.target.value)}
          />
        </section>

        {/* Selected Object Editor */}
        {selectedPage && (
          <section className="animate-in fade-in slide-in-from-left-2 duration-300">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Object Editor</h3>
            <div className="flex flex-col gap-2 mb-6">
               <button 
                onClick={() => onAddText(selectedPage.id)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                + Add Text Box
              </button>
            </div>

            {selectedText ? (
              <div className="bg-slate-900 p-4 rounded-xl border border-blue-900/30 ring-1 ring-blue-500/20">
                <div className="mb-4">
                  <label className="block text-xs text-slate-400 mb-2">Content</label>
                  <textarea 
                    value={selectedText.originalText}
                    onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none h-20 resize-none"
                  />
                  <button 
                    onClick={() => onUpdateText(selectedPage.id, selectedText.id, { originalText: autoWrapText(selectedText.originalText) })}
                    className="mt-2 text-[10px] text-green-400 hover:text-green-300 underline"
                  >
                    Auto Wrap Lines
                  </button>
                </div>
                <div className="p-2 bg-slate-800/50 rounded text-[10px] text-slate-500 italic">
                  Styles for this box are controlled globally.
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs italic">
                Select an object on the canvas to edit content
              </div>
            )}
          </section>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 text-center">
        v1.5.0 - Global Sync & Auto Stack
      </div>
    </aside>
  );
};

export default Sidebar;
