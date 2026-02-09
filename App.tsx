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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} setState={setState} 
        onTextImport={(txt) => {/*... logic import ...*/}}
        onUpdateText={updatePageText}
        onAddText={(pId) => setState(prev => ({ ...prev, pages: prev.pages.map(p => p.id === pId ? { ...p, textObjects: [...p.textObjects, createDefaultTextObject("New", prev.globalStyle)]} : p)}))}
        onClearAll={() => { localStorage.clear(); window.location.reload(); }}
        onUpdateGlobalStyle={(s) => setState(p => ({ ...p, globalStyle: s }))}
        onUpdatePageStyle={(s) => selectedPage && updatePageStyle(selectedPage.id, s)}
      />

      <main className="flex-1 overflow-auto bg-slate-900 p-8">
        {state.pages.length === 0 ? (
          <div className="h-full flex items-center justify-center"><Uploader onUpload={(f) => {/*... logic upload ...*/}} /></div>
        ) : (
          state.isGalleryView ? <Gallery pages={state.pages} hideLabels={state.hideLabels} onSelectPage={(id) => setState(p => ({ ...p, selectedPageId: id, isGalleryView: false }))} /> : (
            <div className="h-full flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-6 bg-slate-800/50 p-3 rounded-xl">
                <button onClick={() => setState(p => ({ ...p, isGalleryView: true }))} className="px-4 py-2 bg-slate-700 rounded-lg">← Back</button>
                <div className="flex gap-4">
                  <button className="px-3 py-1 bg-slate-900 rounded border border-slate-700">UNDO</button>
                  <button className="px-3 py-1 bg-slate-900 rounded border border-slate-700">REDO</button>
                </div>
              </div>
              {selectedPage && (
                <Editor 
                  page={selectedPage} 
                  hideLabels={state.hideLabels}
                  globalStyle={state.globalStyle}
                  selectedTextId={state.selectedTextId} // FIXED: Sekarang dikirim
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