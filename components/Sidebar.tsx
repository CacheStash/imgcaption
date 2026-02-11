import React, { useState } from 'react';
import { AppState, TextObject, Alignment, VerticalAlignment, TextStyle, ImportMode, MaskObject, BoxShape } from '../types';
import { FONT_OPTIONS } from '../utils/helpers';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onTextImport: (text: string) => void;
  onUpdateText: (pageId: string, textId: string, updates: Partial<TextObject>) => void;
  onAddText: (pageId: string) => void;
  onAddMask: (pageId: string, shape?: 'rect' | 'oval') => void;
  onUpdateMask: (pageId: string, maskId: string, updates: Partial<MaskObject>) => void;
  onClearAll: () => void;
  onUpdateGlobalStyle: (style: TextStyle) => void;
  onExportZip: () => void;
  onDownloadSingle: () => void;
  onToggleLocal: (pageId: string) => void;
  isExporting: boolean;
  onSplitText: () => void;
  onDuplicate?: () => void;
  onDeleteLayer?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
}

// Sub-komponen panel lipat dengan animasi halus
const SectionPanel: React.FC<{ 
  title: string; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode; 
  headerClass?: string;
}> = ({ title, isOpen, onToggle, children, headerClass = "text-slate-500" }) => (
  <div className="border-b border-slate-800/50 last:border-0">
    <button 
      onClick={onToggle} 
      className="w-full flex items-center justify-between py-3 px-1 group hover:bg-slate-900/50 transition-colors"
    >
      <h3 className={`text-[10px] font-bold uppercase tracking-wider transition-colors group-hover:text-blue-400 ${headerClass}`}>{title}</h3>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-3 w-3 text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0 mb-0'}`}>
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  state, setState, onTextImport, onUpdateText, onAddText, onAddMask, onUpdateMask, onClearAll, onUpdateGlobalStyle, onExportZip, onDownloadSingle, onToggleLocal, isExporting, onSplitText, onDuplicate, onDeleteLayer, onToggleVisibility
}) => {
  // State panel lipat
  const [openSections, setOpenSections] = useState({
    import: true,
    general: true,
    style: true,
    tools: true,
    layers: true
  });

  const toggle = (key: keyof typeof openSections) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  
  const selectedPage = state.pages.find(p => p.id === state.selectedPageId);
  const selectedText = selectedPage?.textObjects.find(t => t.id === state.selectedTextId);
  const selectedMask = selectedPage?.masks?.find(m => m.id === state.selectedMaskId);
  const activeStyle = (selectedPage?.isLocalStyle && selectedPage.localStyle) ? selectedPage.localStyle : state.globalStyle;
  const activeImportMode = (selectedPage?.isLocalStyle && selectedPage.importMode) ? selectedPage.importMode : state.importMode;

  const updateActiveStyle = (updates: Partial<TextStyle>) => {
    onUpdateGlobalStyle({ ...activeStyle, ...updates });
  };

  const setImportMode = (mode: ImportMode) => {
    if (selectedPage?.isLocalStyle) {
      setState(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id === selectedPage.id ? { ...p, importMode: mode } : p)
      }));
    } else {
      setState(prev => ({ ...prev, importMode: mode }));
    }
  };

  const renderStyleEditor = (style: TextStyle) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Text Color</label>
          <input type="color" value={style.color} onChange={(e) => updateActiveStyle({ color: e.target.value })} className="w-full h-8 rounded bg-slate-900 border border-slate-700" />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Font</label>
          <select value={style.fontFamily} onChange={(e) => updateActiveStyle({ fontFamily: e.target.value })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tombol Font Bold */}
      <div className="flex gap-2">
        <button 
          onClick={() => updateActiveStyle({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}
          className={`flex-1 h-8 rounded border text-[10px] font-bold transition-all ${style.fontWeight === 'bold' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
        >
          {style.fontWeight === 'bold' ? 'BOLD ACTIVE' : 'SET BOLD'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Font Size</label>
        <input type="number" value={style.fontSize} onChange={(e) => updateActiveStyle({ fontSize: Number(e.target.value) })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-2" />
      </div>

      {/* FITUR BARU: DIALOG BOX STYLE */}
      <div className="border-t border-slate-800 pt-3">
        <label className="block text-[10px] text-blue-400 mb-2 font-bold uppercase">Dialog Box Style</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-[9px] text-slate-500 mb-1">Shape</label>
            <select value={style.boxShape || 'none'} onChange={(e) => updateActiveStyle({ boxShape: e.target.value as BoxShape })} className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-[10px] px-1">
              <option value="none">None (Transparent)</option>
              <option value="rect">Rectangle</option>
              <option value="rounded">Rounded</option>
              <option value="oval">Oval / Bubble</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 mb-1">Bg Color</label>
            <input type="color" value={style.backgroundColor || '#000000'} onChange={(e) => updateActiveStyle({ backgroundColor: e.target.value })} className="w-full h-8 rounded bg-slate-900 border border-slate-700" />
          </div>
        </div>
        
        <label className="block text-[9px] text-slate-500 mb-1 uppercase">Padding (Inner Spacing)</label>
        <div className="grid grid-cols-2 gap-2">
          {['Top', 'Bottom', 'Left', 'Right'].map((dir) => (
            <div key={dir} className="flex flex-col">
              <input 
                type="number" 
                placeholder={dir}
                value={(style as any)[`padding${dir}`]} 
                onChange={(e) => updateActiveStyle({ [`padding${dir}`]: Number(e.target.value) })} 
                className="h-7 bg-slate-900 border border-slate-700 rounded text-[10px] px-1 text-center" 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Box Position / Snapping</label>
        <div className="flex bg-slate-900 border border-slate-700 rounded h-8 overflow-hidden mb-1">
          {(['left', 'center', 'right'] as Alignment[]).map((align) => (
            <button key={align} onClick={() => updateActiveStyle({ alignment: align })} className={`flex-1 text-[10px] uppercase font-bold ${style.alignment === align ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{align[0]}</button>
          ))}
        </div>
        <div className="flex bg-slate-900 border border-slate-700 rounded h-8 overflow-hidden mb-3">
          {(['top', 'middle', 'bottom'] as VerticalAlignment[]).map((vAlign) => (
            <button key={vAlign} onClick={() => updateActiveStyle({ verticalAlignment: vAlign })} className={`flex-1 text-[10px] uppercase font-bold ${style.verticalAlignment === vAlign ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{vAlign[0]}</button>
          ))}
        </div>

        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Paragraph Align (Inside Box)</label>
        <div className="flex bg-slate-900 border border-slate-700 rounded h-8 overflow-hidden">
          {(['left', 'center', 'right'] as Alignment[]).map((align) => (
            <button key={align} onClick={() => updateActiveStyle({ textAlign: align })} className={`flex-1 text-[10px] uppercase font-bold ${style.textAlign === align ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{align[0]}</button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Text Outline</label>
        <div className="flex gap-2">
          <input type="color" value={style.outlineColor} onChange={(e) => updateActiveStyle({ outlineColor: e.target.value })} className="w-8 h-8 rounded bg-slate-900 border border-slate-700" />
          <input type="range" min="0" max="15" value={style.outlineWidth} onChange={(e) => updateActiveStyle({ outlineWidth: Number(e.target.value) })} className="flex-1 accent-blue-500" />
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Text Glow</label>
        <div className="flex gap-2 mb-2">
          <input type="color" value={style.glowColor} onChange={(e) => updateActiveStyle({ glowColor: e.target.value })} className="w-8 h-8 rounded bg-slate-900 border border-slate-700" />
          <input type="range" min="0" max="60" value={style.glowBlur} onChange={(e) => updateActiveStyle({ glowBlur: Number(e.target.value) })} className="flex-1 accent-indigo-500" />
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
      <div className="p-6 border-b border-slate-800 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Comic Editor</h1>
          <button onClick={onClearAll} title="Reset Project" className="p-2 text-slate-400 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
        {/* DOWNLOAD BUTTONS (Moved to Top) */}
        <div className="grid grid-cols-2 gap-2">
           {selectedPage && !state.isGalleryView ? (
             <button onClick={onDownloadSingle} className="py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4-4v12" /></svg>
               Save Page
             </button>
           ) : <div/>}
           <button onClick={onExportZip} disabled={isExporting || state.pages.length === 0} className="py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
             Export ZIP
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* GROUP 1: IMPORT TEXT */}
        <SectionPanel title="Import Text" isOpen={openSections.import} onToggle={() => toggle('import')}>
          <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-800/50 shadow-inner">
            <textarea 
              placeholder="Page 1 - Character: Text..." 
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-700" 
              onBlur={(e) => onTextImport(e.target.value)} 
            />
          </div>
        </SectionPanel>

        {/* GROUP 2: GENERAL SETTINGS */}
        <SectionPanel title="General" isOpen={openSections.general} onToggle={() => toggle('general')} headerClass="text-blue-400">
          <div className="space-y-3">
            <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-900/30 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={state.hideLabels} onChange={(e) => setState(prev => ({ ...prev, hideLabels: e.target.checked }))} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
                <span className="text-xs text-slate-300">Hide Character Names</span>
              </label>
              <div className="space-y-1">
                <span className="text-[10px] text-blue-400 font-bold uppercase">Parsing Mode</span>
                <div className="flex bg-slate-800 rounded p-1">
                  <button onClick={() => setImportMode('box')} className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${activeImportMode === 'box' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Merged Box</button>
                  <button onClick={() => setImportMode('full')} className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${activeImportMode === 'full' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Full Width</button>
                </div>
              </div>
              {selectedPage && !state.isGalleryView && (
                <button onClick={() => onToggleLocal(selectedPage.id)} className={`w-full py-2 text-[10px] font-bold rounded border transition-all ${selectedPage.isLocalStyle ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                  {selectedPage.isLocalStyle ? 'LOCAL OVERRIDE ACTIVE' : 'USE GLOBAL SETTINGS'}
                </button>
              )}
            </div>
          </div>
        </SectionPanel>

        {/* GROUP 3: STYLE SETTINGS */}
        <SectionPanel title={selectedPage?.isLocalStyle ? 'Local Style Settings' : 'Global Style Settings'} isOpen={openSections.style} onToggle={() => toggle('style')}>
          <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
            {renderStyleEditor(activeStyle)}
          </div>
        </SectionPanel>

        {/* GROUP 4: TEXT BACKGROUND & TOOLS */}
        {selectedPage && (
          <SectionPanel title="Text Background & Tools" isOpen={openSections.tools} onToggle={() => toggle('tools')} headerClass="text-indigo-400">
            <div className="p-3 border border-slate-800 rounded-xl bg-slate-900/20 space-y-3">
              <button onClick={() => onAddText(selectedPage.id)} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all">+ Manual Text Box</button>
              
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => onAddMask(selectedPage.id, 'rect')} className="py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-600 transition-all flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  + Square
                </button>
                <button onClick={() => onAddMask(selectedPage.id, 'oval')} className="py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-600 transition-all flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  + Oval
                </button>
              </div>

              <button 
                onClick={() => setState(prev => ({ ...prev, isSmartFillMode: !prev.isSmartFillMode, selectedTextId: null, selectedMaskId: null }))} 
                className={`w-full mt-1 py-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${state.isSmartFillMode ? 'bg-pink-600 border-pink-500 text-white animate-pulse shadow-lg shadow-pink-500/20' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-pink-500 hover:text-pink-500'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                {state.isSmartFillMode ? 'CLICK ON BUBBLE TO FILL...' : 'Smart Bucket (Auto Fill)'}
              </button>

              {selectedText && (
                <div className="mt-4 space-y-3 pt-4 border-t border-slate-800/50">
                  <button onClick={onSplitText} className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    Split into Lines
                  </button>
                  <textarea value={selectedText.originalText} onChange={(e) => onUpdateText(selectedPage.id, selectedText.id, { originalText: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs h-20 outline-none focus:ring-1 focus:ring-blue-500 transition-all scrollbar-thin" />
                </div>
              )}

              {selectedMask && (
                <div className="mt-4 p-3 bg-slate-800/30 rounded border border-slate-700/50 space-y-3">
                  <div>
                    <div className="flex justify-between text-[9px] text-slate-400 mb-1 uppercase font-bold">
                      <span>Mask Opacity</span>
                      <span>{Math.round((selectedMask.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={selectedMask.opacity ?? 1} onChange={(e) => onUpdateMask(selectedPage.id, selectedMask.id, { opacity: Number(e.target.value) })} className="w-full accent-blue-500 h-1.5 cursor-pointer" />
                  </div>

                  {selectedMask.type !== 'image' && (
                    <div className="space-y-3 pt-3 border-t border-slate-700/50">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase mb-1 font-bold">Bubble Shape</label>
                        <div className="flex bg-slate-900 rounded p-1 gap-1">
                          <button onClick={() => onUpdateMask(selectedPage.id, selectedMask.id, { shape: 'rect' })} className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${selectedMask.shape !== 'oval' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Square</button>
                          <button onClick={() => onUpdateMask(selectedPage.id, selectedMask.id, { shape: 'oval' })} className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${selectedMask.shape === 'oval' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Oval</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase mb-1 font-bold">Outline</label>
                          <input type="color" value={selectedMask.stroke || '#000000'} onChange={(e) => onUpdateMask(selectedPage.id, selectedMask.id, { stroke: e.target.value })} className="w-full h-7 rounded bg-slate-900 border border-slate-700 cursor-pointer" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase mb-1 font-bold">Width</label>
                          <input type="number" value={selectedMask.strokeWidth || 0} onChange={(e) => onUpdateMask(selectedPage.id, selectedMask.id, { strokeWidth: Number(e.target.value) })} className="w-full h-7 bg-slate-900 border border-slate-700 rounded text-[9px] px-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionPanel>
        )}
      </div>

      {/* GROUP 5: LAYER MANAGER */}
      {selectedPage && (
        <div className="px-6 mb-6">
          <SectionPanel title="Layer Manager" isOpen={openSections.layers} onToggle={() => toggle('layers')} headerClass="text-pink-400">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col h-[300px] shadow-lg">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/50">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Layers</h3>
                <button onClick={onDuplicate} className="text-[9px] bg-slate-800 hover:bg-blue-600 px-2 py-1 rounded border border-slate-700 text-white font-bold transition-all active:scale-95 shadow-sm">Duplicate</button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {/* Group: Dialogues */}
                <div>
                  <div className="text-[9px] text-slate-500 mb-1.5 font-bold uppercase pl-1">Dialogues</div>
                  <div className="space-y-1">
                    {selectedPage.textObjects.map((layer) => (
                      <div key={layer.id} className={`flex items-center gap-2 p-1.5 rounded transition-all group ${state.selectedTextId === layer.id ? 'bg-blue-600/30 border border-blue-500/50' : 'bg-slate-950/50 hover:bg-slate-800'}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(layer.id); }} 
                          className={`p-1 rounded hover:bg-slate-700 ${layer.visible !== false ? 'text-blue-400' : 'text-slate-600'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={layer.visible !== false ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"} />
                          </svg>
                        </button>
                        <div onClick={() => setState(p => ({ ...p, selectedTextId: layer.id, selectedMaskId: null }))} className="flex-1 truncate text-[10px] cursor-pointer text-slate-300">
                          {layer.originalText.substring(0, 20)}...
                        </div>
                        
                        <button onClick={() => onDeleteLayer?.(layer.id)} className="p-1 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group: Masks */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[9px] text-slate-500 mb-1.5 font-bold uppercase pl-1">Masks & Buckets</div>
                  <div className="space-y-1">
                    {(selectedPage.masks || []).map((layer) => (
                      <div key={layer.id} className={`flex items-center gap-2 p-1.5 rounded transition-all group ${state.selectedMaskId === layer.id ? 'bg-blue-600/30 border border-blue-500/50' : 'bg-slate-950/50 hover:bg-slate-800'}`}>
                        <button onClick={() => onToggleVisibility?.(layer.id)} className={`p-1 ${layer.visible !== false ? 'text-blue-400' : 'text-slate-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <div onClick={() => setState(p => ({ ...p, selectedMaskId: layer.id, selectedTextId: null }))} className="flex-1 truncate text-[10px] cursor-pointer text-slate-300">
                          {layer.type === 'image' ? 'Smart Mask' : 'Manual Mask'}
                        </div>
                        <button onClick={() => onDeleteLayer?.(layer.id)} className="p-1 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionPanel>
        </div>
      )}
      <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold bg-slate-950">v2.1.2 Pro</div>
    </aside>
  );
};

export default Sidebar;