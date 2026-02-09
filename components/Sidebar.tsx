import React from 'react';
import { AppState, TextObject, Alignment, VerticalAlignment, TextStyle, ImportMode } from '../types';
import { FONT_OPTIONS } from '../utils/helpers';
import Uploader from './Uploader';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onTextImport: (text: string) => void;
  onUpdateText: (pageId: string, textId: string, updates: Partial<TextObject>) => void;
  onAddText: (pageId: string) => void;
  onClearAll: () => void;
  onUpdateGlobalStyle: (style: TextStyle) => void;
  onExportZip: () => void;
  onDownloadSingle: () => void;
  onToggleLocal: (pageId: string) => void;
  isExporting: boolean;
  onUpload: (files: File[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onClearAll, onUpdateGlobalStyle, onExportZip, onDownloadSingle, onToggleLocal, isExporting, onUpload
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);
  const activeStyle = (selectedPage?.isLocalStyle && selectedPage.localStyle) ? selectedPage.localStyle : state.globalStyle;

  const updateActiveStyle = (updates: Partial<TextStyle>) => {
    onUpdateGlobalStyle({ ...activeStyle, ...updates });
  };

  const renderStyleEditor = (style: TextStyle) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Color</label>
          <input type="color" value={style.color} onChange={(e) => updateActiveStyle({ color: e.target.value })} className="w-full h-8 rounded bg-slate-900 border border-slate-700" />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Font</label>
          <select value={style.fontFamily} onChange={(e) => updateActiveStyle({ fontFamily: e.target.value })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Font Size</label>
        <input type="number" value={style.fontSize} onChange={(e) => updateActiveStyle({ fontSize: Number(e.target.value) })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-2" />
      </div>

      <div className="border-t border-slate-800 pt-3">
        <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase">Global Page Padding (Boundary)</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Top</span>
            <input type="number" value={style.paddingTop} onChange={(e) => updateActiveStyle({ paddingTop: Number(e.target.value) })} className="h-7 bg-slate-900 border border-slate-700 rounded text-[10px] px-1" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Bottom</span>
            <input type="number" value={style.paddingBottom} onChange={(e) => updateActiveStyle({ paddingBottom: Number(e.target.value) })} className="h-7 bg-slate-900 border border-slate-700 rounded text-[10px] px-1" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Left</span>
            <input type="number" value={style.paddingLeft} onChange={(e) => updateActiveStyle({ paddingLeft: Number(e.target.value) })} className="h-7 bg-slate-900 border border-slate-700 rounded text-[10px] px-1" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Right</span>
            <input type="number" value={style.paddingRight} onChange={(e) => updateActiveStyle({ paddingRight: Number(e.target.value) })} className="h-7 bg-slate-900 border border-slate-700 rounded text-[10px] px-1" />
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">H-Pos</label>
        <div className="flex bg-slate-900 border border-slate-700 rounded h-8 overflow-hidden">
          {(['left', 'center', 'right'] as Alignment[]).map((align) => (
            <button key={align} onClick={() => updateActiveStyle({ alignment: align })} className={`flex-1 text-[10px] uppercase font-bold ${style.alignment === align ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{align[0]}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">V-Pos</label>
        <div className="flex bg-slate-900 border border-slate-700 rounded h-8 overflow-hidden">
          {(['top', 'middle', 'bottom'] as VerticalAlignment[]).map((vAlign) => (
            <button key={vAlign} onClick={() => updateActiveStyle({ verticalAlignment: vAlign })} className={`flex-1 text-[10px] uppercase font-bold ${style.verticalAlignment === vAlign ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{vAlign[0]}</button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Outline</label>
        <div className="flex gap-2">
          <input type="color" value={style.outlineColor} onChange={(e) => updateActiveStyle({ outlineColor: e.target.value })} className="w-8 h-8 rounded bg-slate-900 border border-slate-700" />
          <input type="range" min="0" max="15" value={style.outlineWidth} onChange={(e) => updateActiveStyle({ outlineWidth: Number(e.target.value) })} className="flex-1 accent-blue-500" />
        </div>
      </div>
    </div>
  );

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Comic Editor</h1>
        <div className="flex gap-2">
          <button onClick={onExportZip} disabled={isExporting} title="Export All" className="p-2 text-slate-400 hover:text-green-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4-4v12" /></svg></button>
          <button onClick={onClearAll} title="Clear All Data" className="p-2 text-slate-400 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-slate-900/50 bg-slate-900/10">
        <Uploader onUpload={onUpload} />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        <section className="bg-blue-900/10 p-4 rounded-xl border border-blue-900/30 space-y-3">
          <h3 className="text-xs font-bold text-blue-400 uppercase">General</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={state.hideLabels} onChange={(e) => setState(prev => ({ ...prev, hideLabels: e.target.checked }))} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-slate-300 font-medium">Hide Character Names</span>
          </label>
          <div className="space-y-1">
            <span className="text-[10px] text-blue-400 font-bold uppercase">Text Layout Mode</span>
            <div className="flex bg-slate-800 rounded p-1">
              <button onClick={() => setState(prev => ({ ...prev, importMode: 'box' }))} className={`flex-1 py-1.5 text-[9px] font-bold rounded transition-all ${state.importMode === 'box' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>BOX TEXT</button>
              <button onClick={() => setState(prev => ({ ...prev, importMode: 'full' }))} className={`flex-1 py-1.5 text-[9px] font-bold rounded transition-all ${state.importMode === 'full' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>FULL WIDTH</button>
            </div>
          </div>
          {selectedPage && !state.isGalleryView && (
            <button onClick={() => onToggleLocal(selectedPage.id)} className={`w-full py-2 text-[10px] font-bold rounded border transition-colors ${selectedPage.isLocalStyle ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
              {selectedPage.isLocalStyle ? 'LOCAL SETTINGS ACTIVE' : 'USE GLOBAL SETTINGS'}
            </button>
          )}
        </section>

        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">{selectedPage?.isLocalStyle ? 'Local Style' : 'Global Style'}</h3>
          {renderStyleEditor(activeStyle)}
        </section>

        <section className="space-y-2">
          {selectedPage && !state.isGalleryView && (
            <button onClick={onDownloadSingle} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95">Download Page</button>
          )}
          <button onClick={onExportZip} disabled={isExporting || state.pages.length === 0} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale">Export All ZIP</button>
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Import Text Content</h3>
          <textarea placeholder="Page 1 - Character: Dialogue text..." className="w-full h-32 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none" onBlur={(e) => onTextImport(e.target.value)} />
          <p className="text-[9px] text-slate-600 mt-2 italic">* Box mode: formatted block per character. Full mode: continuous flow.</p>
        </section>

        {selectedPage && (
          <section className="p-4 border border-slate-800 rounded-xl bg-slate-900/20 space-y-3">
            <button onClick={() => onAddText(selectedPage.id)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-500">+ Manual Text Box</button>
            {selectedText && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Edit Text</span>
                <textarea value={selectedText.originalText} onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs h-24 outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
            )}
          </section>
        )}
      </div>
      <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold bg-slate-950">v2.0.2 Pro</div>
    </aside>
  );
};

export default Sidebar;