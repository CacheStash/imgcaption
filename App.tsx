import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, TextObject, AppState, TextStyle } from './types';
import { generateId, parseRawText, createDefaultTextObject, DEFAULT_STYLE } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Gallery from './components/Gallery';
import Editor from './components/Editor';
import Uploader from './components/Uploader';

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

  // Sinkronisasi LocalStorage
  useEffect(() => {
    localStorage.setItem('comic-editor-state-v5', JSON.stringify({
      globalStyle: state.globalStyle,
      savedStyles: state.savedStyles,
      hideLabels: state.hideLabels,
    }));
  }, [state.globalStyle, state.savedStyles, state.hideLabels]);

  // FIX: Logika Upload File & Drag n Drop
  const handleUpload = useCallback((files: File[]) => {
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const newPages: Page[] = sortedFiles.map((file) => ({
      id: generateId(),
      imageUrl: URL.createObjectURL(file),
      fileName: file.name,
      textObjects: [],
      bubbles: []
    }));
    setState(prev => ({ ...prev, pages: [...prev.pages, ...newPages] }));
  }, []);

  // FIX: Logika Import Teks Otomatis
  const handleTextImport = useCallback((rawText: string) => {
    const parsedData = parseRawText(rawText);
    setState(prev => ({
      ...prev,
      pages: prev.pages.map((page, index) => {
        const pageNum = index + 1;
        if (parsedData[pageNum]) {
          const newObjects = parsedData[pageNum].map(txt => createDefaultTextObject(txt, prev.globalStyle));
          return { ...page, textObjects: [...page.textObjects, ...newObjects] };
        }
        return page;
      })
    }));
  }, []);

  const updatePageText = useCallback((pageId: string, textId: string, updates: Partial<TextObject>) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { 
        ...p, textObjects: p.textObjects.map(t => t.id === textId ? { ...t, ...updates } : t) 
      } : p)
    }));
  }, []);

  const updatePageStyle = useCallback((pageId: string, style: TextStyle | undefined) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, overrideStyle: style } : p)
    }));
  }, []);

  const selectedPageIndex = useMemo(() => state.pages.findIndex(p => p.id === state.selectedPageId), [state.pages, state.selectedPageId]);
  const selectedPage = state.pages[selectedPageIndex] || null;

  // FIX: Logika Navigasi Halaman
  const navigatePage = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? selectedPageIndex + 1 : selectedPageIndex - 1;
    if (newIndex >= 0 && newIndex < state.pages.length) {
      setState(prev => ({ ...prev, selectedPageId: state.pages[newIndex].id, selectedTextId: null }));
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} setState={setState} 
        onTextImport={handleTextImport}
        onUpdateText={updatePageText}
        onAddText={(pId) => setState(prev => ({ ...prev, pages: prev.pages.map(p => p.id === pId ? { ...p, textObjects: [...p.textObjects, createDefaultTextObject("New", prev.globalStyle)]} : p)}))}
        onClearAll={() => { localStorage.clear(); window.location.reload(); }}
        onUpdateGlobalStyle={(s) => setState(p => ({ ...p, globalStyle: s }))}
        onUpdatePageStyle={(s) => selectedPage && updatePageStyle(selectedPage.id, s)}
      />

      <main className="flex-1 overflow-auto bg-slate-900 p-8">
        {state.pages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Uploader onUpload={handleUpload} />
          </div>
        ) : (
          state.isGalleryView ? (
            <Gallery 
              pages={state.pages} 
              hideLabels={state.hideLabels} 
              onSelectPage={(id) => setState(p => ({ ...p, selectedPageId: id, isGalleryView: false }))} 
            />
          ) : (
            <div className="h-full flex flex-col items-center">
              {/* Toolbar Navigasi & Action */}
              <div className="w-full flex justify-between items-center mb-6 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <div className="flex gap-2">
                  <button onClick={() => setState(prev => ({ ...prev, isGalleryView: true }))} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">← Back</button>
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => navigatePage('prev')} disabled={selectedPageIndex === 0} className="p-2 hover:bg-slate-800 disabled:opacity-30 rounded px-3">PREV</button>
                    <span className="px-3 text-xs font-mono text-slate-400">{selectedPageIndex + 1} / {state.pages.length}</span>
                    <button onClick={() => navigatePage('next')} disabled={selectedPageIndex === state.pages.length - 1} className="p-2 hover:bg-slate-800 disabled:opacity-30 rounded px-3">NEXT</button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-slate-900 hover:bg-slate-700 rounded border border-slate-700 text-[10px]">UNDO</button>
                  <button className="px-3 py-1 bg-slate-900 hover:bg-slate-700 rounded border border-slate-700 text-[10px]">REDO</button>
                  <button onClick={() => window.location.reload()} className="px-3 py-1 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded border border-red-900/50 text-[10px]">RESET PAGE</button>
                </div>
              </div>

              {selectedPage && (
                <Editor 
                  page={selectedPage} 
                  hideLabels={state.hideLabels}
                  globalStyle={state.globalStyle}
                  selectedTextId={state.selectedTextId} // FIX: Prop sekarang dikirim
                  onUpdateText={(textId, updates) => updatePageText(selectedPage.id, textId, updates)}
                  onSelectText={(id) => setState(prev => ({ ...prev, selectedTextId: id }))}
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