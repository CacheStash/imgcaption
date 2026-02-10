import React from 'react';
import { AppState, TextObject, Alignment, VerticalAlignment, TextStyle, MaskObject } from '../types';
import { FONT_OPTIONS } from '../utils/helpers';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onTextImport: (text: string) => void;
  onUpdateText: (pageId: string, textId: string, updates: Partial<TextObject>) => void;
  onAddText: (pageId: string) => void;
  onAddMask: (pageId: string) => void;
  onUpdateMask: (pageId: string, maskId: string, updates: Partial<MaskObject>) => void;
  onClearAll: () => void;
  onUpdateGlobalStyle: (style: TextStyle) => void;
  onExportZip: () => void;
  onDownloadSingle: () => void;
  onToggleLocal: (pageId: string) => void;
  isExporting: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onAddMask, onClearAll, onUpdateGlobalStyle, onExportZip, onDownloadSingle, onToggleLocal, isExporting
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
        <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase">Boundary / Global Padding</label>
        <div className="grid grid-cols-2 gap-2">
          {['Top', 'Bottom', 'Left', 'Right'].map((dir) => (
            <div key={dir} className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase">{dir}</span>
              <input 
                type="number" 
                value={(style as any)[`padding${dir}`]} 
                onChange={(e) => updateActiveStyle({ [`padding${dir}`]: Number(e.target.value) })} 
                className="h-7 bg-slate-900 border border-slate-700 rounded text-[10px] px-1" 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Comic Editor</h1>
        <div className="flex gap-2">
          <button onClick={onExportZip} disabled={isExporting} className="p-2 text-slate-400 hover:text-green-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4-4v12" /></svg></button>
          <button onClick={onClearAll} className="p-2 text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        <section className="bg-blue-600/5 p-4 rounded-xl border border-blue-600/20">
          <textarea placeholder="Page 1 - Character: Dialogue..." className="w-full h-32 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none" onBlur={(e) => onTextImport(e.target.value)} />
        </section>
        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">{selectedPage?.isLocalStyle ? 'Local Style' : 'Global Style'}</h3>
          {renderStyleEditor(activeStyle)}
        </section>
        {selectedPage && (
          <section className="p-4 border border-slate-800 rounded-xl bg-slate-900/20 space-y-3">
            <button onClick={() => onAddText(selectedPage.id)} className="w-full py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">+ Manual Text Box</button>
            <button onClick={() => onAddMask(selectedPage.id)} className="w-full py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">+ Paint Bucket (Mask)</button>
            {selectedText && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <textarea value={selectedText.originalText} onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs h-24 outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;