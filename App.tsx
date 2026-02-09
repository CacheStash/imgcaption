
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, TextObject, AppState, TextStyle } from './types';
import { generateId, parseRawText, createDefaultTextObject, DEFAULT_STYLE, autoWrapText } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Gallery from './components/Gallery';
import Editor from './components/Editor';
import Uploader from './components/Uploader';

interface HistoryState {
  past: Page[][];
  future: Page[][];
}

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('comic-editor-state-v4');
    const initial: AppState = {
      pages: [],
      hideLabels: false,
      selectedPageId: null,
      selectedTextId: null,
      isGalleryView: true,
      globalStyle: DEFAULT_STYLE,
      savedStyles: [],
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed, isGalleryView: true, selectedPageId: null };
      } catch(e) { return initial; }
    }
    return initial;
  });

  const recordHistory = useCallback(() => {
    setHistory(prev => ({
      past: [...prev.past, JSON.parse(JSON.stringify(state.pages))],
      future: []
    }));
  }, [state.pages]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);
    
    setHistory({
      past: newPast,
      future: [state.pages, ...history.future]
    });
    
    setState(prev => ({ ...prev, pages: previous }));
  }, [history, state.pages]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    setHistory({
      past: [...history.past, state.pages],
      future: newFuture
    });
    
    setState(prev => ({ ...prev, pages: next }));
  }, [history, state.pages]);

  const resetCurrentPage = useCallback(() => {
    if (!state.selectedPageId || !confirm("Clear all text from this page?")) return;
    recordHistory();
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === state.selectedPageId ? { ...p, textObjects: [] } : p)
    }));
  }, [state.selectedPageId, recordHistory]);

  const clearAllData = useCallback(() => {
    if (!confirm("Delete all pages and progress? This cannot be undone.")) return;
    setHistory({ past: [], future: [] });
    setState(prev => ({
      ...prev,
      pages: [],
      selectedPageId: null,
      isGalleryView: true
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    localStorage.setItem('comic-editor-state-v4', JSON.stringify({
      globalStyle: state.globalStyle,
      savedStyles: state.savedStyles,
      hideLabels: state.hideLabels,
    }));
  }, [state.globalStyle, state.savedStyles, state.hideLabels]);

  const handleUpload = useCallback((files: File[]) => {
    recordHistory();
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
    const newPages: Page[] = sortedFiles.map((file) => ({
      id: generateId(),
      imageUrl: URL.createObjectURL(file),
      fileName: file.name,
      textObjects: [],
    }));

    setState(prev => ({ ...prev, pages: [...prev.pages, ...newPages] }));
  }, [recordHistory]);

  const handleTextImport = useCallback((rawText: string) => {
    recordHistory();
    const parsedData = parseRawText(rawText);
    setState(prev => {
      const updatedPages = prev.pages.map((page, index) => {
        const pageNum = index + 1;
        if (parsedData[pageNum]) {
          const newObjects = parsedData[pageNum].map(txt => 
            createDefaultTextObject(txt, prev.globalStyle)
          );
          return { ...page, textObjects: [...page.textObjects, ...newObjects] };
        }
        return page;
      });
      return { ...prev, pages: updatedPages };
    });
  }, [recordHistory]);

  const updatePageText = useCallback((pageId: string, textId: string, updates: Partial<TextObject>) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          textObjects: p.textObjects.map(t => t.id === textId ? { ...t, ...updates } : t)
        };
      })
    }));
  }, []);

  const addTextManually = useCallback((pageId: string) => {
    recordHistory();
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => {
        if (p.id !== pageId) return p;
        const newObj = createDefaultTextObject("New Dialogue", prev.globalStyle);
        return {
          ...p,
          textObjects: [...p.textObjects, newObj]
        };
      }),
      selectedTextId: null 
    }));
  }, [recordHistory]);

  const handleSelectText = useCallback((id: string | null) => {
    setState(prev => {
      if (prev.selectedTextId === id) return prev;
      return { ...prev, selectedTextId: id };
    });
  }, []);

  const selectedPage = useMemo(() => 
    state.pages.find(p => p.id === state.selectedPageId) || null,
  [state.pages, state.selectedPageId]);

  const currentPageIndex = useMemo(() => 
    state.pages.findIndex(p => p.id === state.selectedPageId),
  [state.pages, state.selectedPageId]);

  const goToPrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setState(prev => ({
        ...prev,
        selectedPageId: prev.pages[currentPageIndex - 1].id,
        selectedTextId: null
      }));
    }
  }, [currentPageIndex]);

  const goToNextPage = useCallback(() => {
    if (currentPageIndex < state.pages.length - 1) {
      setState(prev => ({
        ...prev,
        selectedPageId: prev.pages[currentPageIndex + 1].id,
        selectedTextId: null
      }));
    }
  }, [currentPageIndex, state.pages.length]);

  // Bulk update all existing objects when global style changes
  const updateGlobalStyle = useCallback((newStyle: TextStyle) => {
    setState(prev => ({
      ...prev,
      globalStyle: newStyle,
      pages: prev.pages.map(page => ({
        ...page,
        textObjects: page.textObjects.map(obj => ({
          ...obj,
          ...newStyle
        }))
      }))
    }));
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} 
        setState={setState} 
        onTextImport={handleTextImport}
        onUpdateText={updatePageText}
        onAddText={addTextManually}
        onClearAll={clearAllData}
        onUpdateGlobalStyle={updateGlobalStyle}
      />

      <main className="flex-1 relative overflow-auto bg-slate-900 p-8">
        {state.pages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Uploader onUpload={handleUpload} />
          </div>
        ) : (
          <>
            {state.isGalleryView ? (
              <Gallery 
                pages={state.pages} 
                hideLabels={state.hideLabels}
                onSelectPage={(id) => setState(prev => ({ ...prev, selectedPageId: id, isGalleryView: false }))} 
              />
            ) : (
              <div className="h-full flex flex-col items-center">
                <div className="mb-4 flex items-center gap-4 w-full justify-between bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setState(prev => ({ ...prev, isGalleryView: true, selectedPageId: null, selectedTextId: null }))}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      ← Back
                    </button>
                    
                    <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
                    
                    <button 
                      onClick={goToPrevPage}
                      disabled={currentPageIndex <= 0}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
                      title="Previous Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <button 
                      onClick={goToNextPage}
                      disabled={currentPageIndex >= state.pages.length - 1}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
                      title="Next Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>

                    <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
                    
                    <button 
                      onClick={undo}
                      disabled={history.past.length === 0}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
                      title="Undo (Ctrl+Z)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    
                    <button 
                      onClick={redo}
                      disabled={history.future.length === 0}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
                      title="Redo (Ctrl+Y)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
                    </button>
                    
                    <button 
                      onClick={resetCurrentPage}
                      className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-all"
                      title="Reset Current Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedPage?.fileName}</p>
                      <p className="text-[10px] text-blue-500">Page {currentPageIndex + 1} of {state.pages.length}</p>
                    </div>
                  </div>
                </div>

                {selectedPage && (
                  <Editor 
                    page={selectedPage} 
                    hideLabels={state.hideLabels}
                    onUpdateText={(textId, updates) => updatePageText(selectedPage.id, textId, updates)}
                    selectedTextId={state.selectedTextId}
                    onSelectText={handleSelectText}
                    onRecordHistory={recordHistory}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
