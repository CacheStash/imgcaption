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
      selectedBubbleId: null, isGalleryView: true, globalStyle: DEFAULT_STYLE, savedStyles: [],
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
    localStorage.setItem('comic-editor-state-v5', JSON.stringify({
      globalStyle: state.globalStyle,
      savedStyles: state.savedStyles,
      hideLabels: state.hideLabels,
    }));
  }, [state.globalStyle, state.savedStyles, state.hideLabels]);

  const handleUpload = useCallback((files: File[]) => {
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
    const newPages: Page[] = sortedFiles.map((file) => ({
      id: generateId(),
      imageUrl: URL.createObjectURL(file),
      fileName: file.name,
      textObjects: [],
      bubbles: []
    }));
    setState(prev => ({ ...prev, pages: [...prev.pages, ...newPages] }));
  }, []);

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

  const updateGlobalStyle = useCallback((newStyle: TextStyle) => {
    setState(prev => ({
      ...prev,
      globalStyle: newStyle,
      pages: prev.pages.map(page => ({
        ...page,
        textObjects: page.textObjects.map(obj => ({ ...obj, ...newStyle }))
      }))
    }));
  }, []);

  const selectedPage = useMemo(() => state.pages.find(p => p.id === state.selectedPageId) || null, [state.pages, state.selectedPageId]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} setState={setState} 
        onTextImport={handleTextImport} onUpdateText={updatePageText}
        onAddText={(pId) => setState(prev => ({ ...prev, pages: prev.pages.map(p => p.id === pId ? { ...p, textObjects: [...p.textObjects, createDefaultTextObject("New", prev.globalStyle)]} : p)}))}
        onClearAll={() => { localStorage.clear(); window.location.reload(); }}
        onUpdateGlobalStyle={updateGlobalStyle}
      />

      <main className="flex-1 relative overflow-auto bg-slate-900 p-8">
        {state.pages.length === 0 ? <Uploader onUpload={handleUpload} /> : (
          state.isGalleryView ? (
            <Gallery 
              pages={state.pages} 
              hideLabels={state.hideLabels} 
              onSelectPage={(id) => setState(prev => ({ ...prev, selectedPageId: id, isGalleryView: false }))} 
            />
          ) : (
            <div className="h-full flex flex-col items-center">
              <button onClick={() => setState(prev => ({ ...prev, isGalleryView: true }))} className="mb-4 px-4 py-2 bg-slate-800 rounded-lg self-start">← Back</button>
              {selectedPage && (
                <Editor 
                  page={selectedPage} 
                  hideLabels={state.hideLabels}
                  globalStyle={state.globalStyle} // INI YANG TADI KURANG
                  onUpdateText={(textId, updates) => updatePageText(selectedPage.id, textId, updates)}
                  selectedTextId={state.selectedTextId}
                  onSelectText={(id) => setState(prev => ({ ...prev, selectedTextId: id }))}
                  onRecordHistory={() => {}}
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