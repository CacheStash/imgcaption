import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, TextObject, AppState, TextStyle } from './types';
import { generateId, parseRawText, createDefaultTextObject, DEFAULT_STYLE, loadPageFromCache, savePageToCache } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Gallery from './components/Gallery';
import Editor from './components/Editor';
import Uploader from './components/Uploader';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('comic-editor-state-v5');
    const initial: AppState = {
      pages: [], hideLabels: false, selectedPageId: null, selectedTextId: null,
      selectedBubbleId: null, isGalleryView: true, globalStyle: DEFAULT_STYLE, savedStyles: []
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed, isGalleryView: true, selectedPageId: null };
      } catch(e) { return initial; }
    }
    return initial;
  });

  useEffect(() => {
    state.pages.forEach(p => savePageToCache(p));
  }, [state.pages]);

  const updatePageText = useCallback((pageId: string, textId: string, updates: Partial<TextObject>) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { 
        ...p, textObjects: p.textObjects.map(t => t.id === textId ? { ...t, ...updates } : t) 
      } : p)
    }));
  }, []);

  const selectedPageIndex = useMemo(() => state.pages.findIndex(p => p.id === state.selectedPageId), [state.pages, state.selectedPageId]);
  const selectedPage = state.pages[selectedPageIndex] || null;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} setState={setState} 
        onTextImport={(rawText) => {/* Logic Import */}}
        onUpdateText={updatePageText}
        onAddText={(pId) => setState(prev => ({ ...prev, pages: prev.pages.map(p => p.id === pId ? { ...p, textObjects: [...p.textObjects, createDefaultTextObject("New", prev.globalStyle)]} : p)}))}
        onClearAll={() => { localStorage.clear(); window.location.reload(); }}
        onUpdateGlobalStyle={(s) => setState(p => ({ ...p, globalStyle: s }))}
        onUpdatePageStyle={(s) => selectedPage && setState(prev => ({...prev, pages: prev.pages.map(p => p.id === selectedPage.id ? {...p, overrideStyle: s} : p)}))}
      />

      <main className="flex-1 relative overflow-auto bg-slate-900 p-8">
        <div className="absolute top-4 right-4 z-50">
          <button onClick={async () => {/* Export ZIP Logic */}} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all">EXPORT ZIP</button>
        </div>
        
        {state.pages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Uploader onUpload={(files) => {/* Upload Logic */}} />
          </div>
        ) : (
          state.isGalleryView ? (
            <Gallery pages={state.pages} hideLabels={state.hideLabels} onSelectPage={(id) => setState(p => ({ ...p, selectedPageId: id, isGalleryView: false }))} />
          ) : (
            <div className="h-full flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-6 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <button onClick={() => setState(p => ({ ...p, isGalleryView: true }))} className="px-4 py-2 bg-slate-700 rounded-lg text-sm">← Back</button>
              </div>

              {selectedPage && (
                <Editor 
  page={selectedPage} 
  hideLabels={state.hideLabels}
  globalStyle={state.globalStyle}
  selectedTextId={state.selectedTextId}
  // BUNGKUS DENGAN ARROW FUNCTION AGAR ARGUMEN COCOK
  onUpdateText={(textId, updates) => updatePageText(selectedPage.id, textId, updates)}
  onSelectText={(id) => setState(prev => ({ ...prev, selectedTextId: id }))}
  onUpdateOverride={(s) => setState(prev => ({
    ...prev, 
    pages: prev.pages.map(p => p.id === selectedPage.id ? {...p, overrideStyle: s} : p)
  }))}
/>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
};
export default App;