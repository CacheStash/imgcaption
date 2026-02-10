import React from 'react';
import { AppState, TextObject, Alignment, VerticalAlignment, TextStyle, ImportMode, MaskObject } from '../types';
import { FONT_OPTIONS } from '../utils/helpers';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onTextImport: (text: string) => void;
  onUpdateText: (pageId: string, textId: string, updates: Partial<TextObject>) => void;
  onAddText: (pageId: string) => void;
  onAddMask: (pageId: string) => void; // Prop baru untuk Paint Bucket
  onUpdateMask: (pageId: string, maskId: string, updates: Partial<MaskObject>) => void; // Prop baru
  onClearAll: () => void;
  onUpdateGlobalStyle: (style: TextStyle) => void;
  onExportZip: () => void;
  onDownloadSingle: () => void;
  onToggleLocal: (pageId: string) => void;
  isExporting: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onAddMask, onUpdateMask, onClearAll, onUpdateGlobalStyle, onExportZip, onDownloadSingle, onToggleLocal, isExporting
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);
  const activeStyle = (selectedPage?.isLocalStyle && selectedPage.localStyle) ? selectedPage.localStyle : state.globalStyle;

  // FIX: Tentukan mode mana yang aktif (Halaman atau Global) untuk UI
  const activeImportMode = (selectedPage?.isLocalStyle && selectedPage.importMode) 
    ? selectedPage.importMode 
    : state.importMode;

  const updateActiveStyle = (updates: Partial<TextStyle>) => {
    onUpdateGlobalStyle({ ...activeStyle, ...updates });
  };

  // FIX: Handler khusus untuk mengubah Parsing Mode secara aman (Local vs Global)
  const setImportMode = (mode: ImportMode) => {
    if (selectedPage?.isLocalStyle) {
      // Jika Local Override aktif, ubah HANYA halaman ini
      setState(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id === selectedPage.id ? { ...p, importMode: mode } : p)
      }));
    } else {
      // Jika Global, ubah setting utama
      setState(prev => ({ ...prev, importMode: mode }));
    }
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
        <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase">Box Offset / Padding</label>
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

      <div className="border-t border-slate-800 pt-3">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Outer Glow</label>
        <div className="flex gap-2 mb-2">
          <input type="color" value={style.glowColor} onChange={(e) => updateActiveStyle({ glowColor: e.target.value })} className="w-8 h-8 rounded bg-slate-900 border border-slate-700" title="Glow Color" />
          <input type="range" min="0" max="60" value={style.glowBlur} onChange={(e) => updateActiveStyle({ glowBlur: Number(e.target.value) })} className="flex-1 accent-indigo-500" title="Glow Size" />
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[9px] text-slate-500 uppercase">Intensity</span>
           <input type="range" min="0" max="1" step="0.1" value={style.glowOpacity} onChange={(e) => updateActiveStyle({ glowOpacity: Number(e.target.value) })} className="flex-1 accent-indigo-500" />
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
        <section className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Import Text</h3>
          <textarea 
            placeholder="Page 1 - Character: Text..." 
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
            onBlur={(e) => onTextImport(e.target.value)} 
          />
          <p className="text-[9px] text-slate-600 mt-1 italic tracking-tight">* Merged Box puts all page dialogue in one box.</p>
        </section>

        <section className="bg-blue-900/10 p-4 rounded-xl border border-blue-900/30 space-y-3">
          <h3 className="text-xs font-bold text-blue-400 uppercase">General</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={state.hideLabels} onChange={(e) => setState(prev => ({ ...prev, hideLabels: e.target.checked }))} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-slate-300">Hide Character Names</span>
          </label>
          <div className="space-y-1">
            <span className="text-[10px] text-blue-400 font-bold uppercase">Parsing Mode</span>
            {/* FIX: Tombol parsing mode sekarang menggunakan setImportMode */}
            <div className="flex bg-slate-800 rounded p-1">
              <button onClick={() => setImportMode('box')} className={`flex-1 py-1 text-[9px] font-bold rounded ${activeImportMode === 'box' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Merged Box</button>
              <button onClick={() => setImportMode('full')} className={`flex-1 py-1 text-[9px] font-bold rounded ${activeImportMode === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Full Width</button>
            </div>
          </div>
          {selectedPage && !state.isGalleryView && (
            <button onClick={() => onToggleLocal(selectedPage.id)} className={`w-full py-2 text-[10px] font-bold rounded border transition-colors ${selectedPage.isLocalStyle ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
              {selectedPage.isLocalStyle ? 'LOCAL OVERRIDE ACTIVE' : 'USE GLOBAL SETTINGS'}
            </button>
          )}
        </section>

        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">{selectedPage?.isLocalStyle ? 'Local Style' : 'Global Style'}</h3>
          {renderStyleEditor(activeStyle)}
        </section>

        <section className="space-y-2">
          {selectedPage && !state.isGalleryView && (
            <button onClick={onDownloadSingle} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg">Download Current Page</button>
          )}
          <button onClick={onExportZip} disabled={isExporting || state.pages.length === 0} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg">Export All ZIP</button>
        </section>

        {selectedPage && (
          <section className="p-4 border border-slate-800 rounded-xl bg-slate-900/20">
            <button onClick={() => onAddText(selectedPage.id)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">+ Manual Text Box</button>
            
            {/* FIX: Tombol Paint Bucket Baru */}
            <button onClick={() => onAddMask(selectedPage.id)} className="w-full mt-2 py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-600 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              + Paint Bucket (Mask)
            </button>

            {selectedText && (
              <div className="mt-4 space-y-3">
                <textarea value={selectedText.originalText} onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs h-24 outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            )}
          </section>
        )}
      </div>
      <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold bg-slate-950">v2.1.2 Pro</div>
    </aside>
  );
};

export default Sidebar;