import React from 'react';
import { AppState, TextObject, Alignment, VerticalAlignment, TextStyle, ImportMode, MaskObject, BoxShape } from '../types';
import { FONT_OPTIONS } from '../utils/helpers';

interface SidebarProps {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onTextImport: (text: string) => void;
  onUpdateText: (pageId: string, textId: string, updates: Partial<TextObject>) => void; onAddText: (pageId: string) => void;
  onAddMask: (pageId: string) => void; onUpdateMask: (pageId: string, maskId: string, updates: Partial<MaskObject>) => void;
  onClearAll: () => void; onUpdateGlobalStyle: (style: TextStyle) => void; onExportZip: () => void; onDownloadSingle: () => void;
  onToggleLocal: (pageId: string) => void; isExporting: boolean; onSplitText: () => void; onDuplicate?: () => void;
  onDeleteLayer?: (id: string) => void; onToggleVisibility?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onAddMask, onUpdateMask, onClearAll, onUpdateGlobalStyle, onExportZip, onDownloadSingle, onToggleLocal, isExporting, onSplitText, onDuplicate, onDeleteLayer, onToggleVisibility
}) => {
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);
  const selectedMask = selectedPage?.masks?.find(m => m.id === state.selectedMaskId);
  const activeStyle = (selectedPage?.isLocalStyle && selectedPage.localStyle) ? selectedPage.localStyle : state.globalStyle;
  const activeImportMode = (selectedPage?.isLocalStyle && selectedPage.importMode) ? selectedPage.importMode : state.importMode;

  const updateActiveStyle = (updates: Partial<TextStyle>) => onUpdateGlobalStyle({ ...activeStyle, ...updates });

  const renderLayerItem = (layer: any, type: 'Text' | 'Mask') => {
    const isSelected = state.selectedTextId === layer.id || state.selectedMaskId === layer.id;
    const isVisible = layer.visible !== false;
    return (
      <div key={layer.id} className={`flex items-center gap-2 p-1.5 rounded transition-all group ${isSelected ? 'bg-blue-600/30 border border-blue-500/50 text-white' : 'bg-slate-900/50 border border-transparent text-slate-400 hover:bg-slate-800'}`}>
        <button onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(layer.id); }} className={`p-1 rounded hover:bg-slate-700 ${isVisible ? 'text-blue-400' : 'text-slate-600'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isVisible ? 2 : 1.5} d={isVisible ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"} />
          </svg>
        </button>
        <div onClick={() => { if (type === 'Text') setState(p => ({ ...p, selectedTextId: layer.id, selectedMaskId: null })); else setState(p => ({ ...p, selectedMaskId: layer.id, selectedTextId: null })); }} className="flex-1 truncate text-[10px] cursor-pointer font-medium">
          {type === 'Text' ? layer.originalText.substring(0, 20) || 'Dialogue' : (layer.type === 'image' ? 'Smart Mask' : 'Manual Mask')}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDeleteLayer?.(layer.id); }} className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-500 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    );
  };

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between"><h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Comic Editor</h1></div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        <section className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Import Text</h3>
          <textarea placeholder="Page 1 - Character: Text..." className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all" onBlur={(e) => onTextImport(e.target.value)} />
        </section>

        <section className="bg-blue-900/10 p-4 rounded-xl border border-blue-900/30 space-y-3">
          <div className="flex bg-slate-800 rounded p-1">
            <button onClick={() => setState(prev => ({...prev, importMode: 'box'}))} className={`flex-1 py-1 text-[9px] font-bold rounded ${activeImportMode === 'box' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Merged Box</button>
            <button onClick={() => setState(prev => ({...prev, importMode: 'full'}))} className={`flex-1 py-1 text-[9px] font-bold rounded ${activeImportMode === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Full Width</button>
          </div>
        </section>

        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Style Editor</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input type="color" value={activeStyle.color} onChange={(e) => updateActiveStyle({ color: e.target.value })} className="w-full h-8 rounded bg-slate-900 border border-slate-700" />
            <select value={activeStyle.fontFamily} onChange={(e) => updateActiveStyle({ fontFamily: e.target.value })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px]">
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 mb-4"><label className="text-[10px] text-slate-500">Size: {activeStyle.fontSize}px</label><input type="range" min="10" max="100" value={activeStyle.fontSize} onChange={(e) => updateActiveStyle({ fontSize: Number(e.target.value) })} className="accent-blue-500" /></div>
        </section>

        {selectedPage && (
          <section className="p-4 border border-slate-800 rounded-xl bg-slate-900/20 space-y-2">
            <button onClick={() => onAddText(selectedPage.id)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">+ Dialogue Box</button>
            <button onClick={() => setState(prev => ({ ...prev, isSmartFillMode: !prev.isSmartFillMode }))} className={`w-full py-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${state.isSmartFillMode ? 'bg-pink-600 border-pink-500 text-white animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              Smart Bucket
            </button>
            {selectedMask && (
              <div className="p-2 bg-slate-800 rounded border border-slate-700 space-y-2">
                <div className="flex justify-between text-[9px] text-slate-400 uppercase"><span>Mask Opacity</span><span>{Math.round((selectedMask.opacity ?? 1)*100)}%</span></div>
                <input type="range" min="0" max="1" step="0.05" value={selectedMask.opacity ?? 1} onChange={(e) => onUpdateMask(selectedPage.id, selectedMask.id, { opacity: Number(e.target.value) })} className="w-full h-1.5 accent-blue-500" />
              </div>
            )}
            {selectedText && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button onClick={onSplitText} className="w-full py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold">Split Dialogue</button>
                <textarea value={selectedText.originalText} onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })} className="w-full h-20 bg-slate-950 border border-slate-800 rounded p-2 text-xs" />
              </div>
            )}
          </section>
        )}
      </div>

      {selectedPage && (
        <div className="mx-6 mb-6 p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Layers</h3>
            <button onClick={onDuplicate} className="text-[9px] bg-slate-800 hover:bg-blue-600 px-2 py-1 rounded border border-slate-700 text-white font-bold transition-all">Duplicate</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            <div>
              <div className="text-[9px] text-slate-500 mb-1.5 font-bold uppercase tracking-tight pl-1">Dialogues</div>
              <div className="space-y-1">{(selectedPage.textObjects || []).map(t => renderLayerItem(t, 'Text'))}</div>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[9px] text-slate-500 mb-1.5 font-bold uppercase tracking-tight pl-1">Masks & Buckets</div>
              <div className="space-y-1">{(selectedPage.masks || []).map(m => renderLayerItem(m, 'Mask'))}</div>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 text-center font-bold tracking-tighter">COMIC TEXT EDITOR PRO v2.1.2</div>
    </aside>
  );
};

export default Sidebar;