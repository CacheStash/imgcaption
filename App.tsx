// FULL REWRITE - Memperbaiki isolasi Local Style
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, TextObject, AppState, TextStyle, ImportMode } from './types';
import { generateId, parseRawText, createDefaultTextObject, DEFAULT_STYLE, cleanText, getPosFromAlign } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Gallery from './components/Gallery';
import Editor from './components/Editor';
import Uploader from './components/Uploader';

declare const fabric: any;
declare const JSZip: any;

interface HistoryState {
  past: Page[][];
  future: Page[][];
}

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [isExporting, setIsExporting] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(1);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('comic-editor-state-v10');
    const initial: AppState = {
      pages: [],
      hideLabels: false,
      importMode: 'box',
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

  const selectedPage = useMemo(() => 
    state.pages.find(p => p.id === state.selectedPageId),
  [state.pages, state.selectedPageId]);

  const currentPageIndex = useMemo(() => 
    state.pages.findIndex(p => p.id === state.selectedPageId),
  [state.pages, state.selectedPageId]);

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
    setHistory({ past: newPast, future: [state.pages, ...history.future] });
    setState(prev => ({ ...prev, pages: previous }));
  }, [history, state.pages]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    setHistory({ past: [...history.past, state.pages], future: newFuture });
    setState(prev => ({ ...prev, pages: next }));
  }, [history, state.pages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    localStorage.setItem('comic-editor-state-v10', JSON.stringify({
      globalStyle: state.globalStyle,
      savedStyles: state.savedStyles,
      hideLabels: state.hideLabels,
      importMode: state.importMode,
    }));
  }, [state.globalStyle, state.savedStyles, state.hideLabels, state.importMode]);

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
    const parsedData = parseRawText(rawText, state.importMode);
    setState(prev => {
      const updatedPages = prev.pages.map((page, index) => {
        const pageNum = index + 1;
        if (parsedData[pageNum]) {
          const styleToUse = page.isLocalStyle && page.localStyle ? page.localStyle : prev.globalStyle;
          const newObjects = parsedData[pageNum].map(txt => createDefaultTextObject(txt, styleToUse));
          return { ...page, textObjects: [...page.textObjects, ...newObjects] };
        }
        return page;
      });
      return { ...prev, pages: updatedPages };
    });
  }, [recordHistory, state.importMode]);

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
        const styleToUse = p.isLocalStyle && p.localStyle ? p.localStyle : prev.globalStyle;
        const newObj = createDefaultTextObject("New Dialogue", styleToUse);
        return { ...p, textObjects: [...p.textObjects, newObj] };
      }),
      selectedTextId: null 
    }));
  }, [recordHistory]);

  const handleSelectText = useCallback((id: string | null) => {
    setState(prev => (prev.selectedTextId === id ? prev : { ...prev, selectedTextId: id }));
  }, []);

  const clearAllData = useCallback(() => {
    if (window.confirm("Delete everything?")) {
      recordHistory();
      setState(prev => ({ ...prev, pages: [], selectedPageId: null, isGalleryView: true }));
    }
  }, [recordHistory]);

  const goToPrevPage = useCallback(() => {
    setState(prev => {
      const idx = prev.pages.findIndex(p => p.id === prev.selectedPageId);
      if (idx > 0) return { ...prev, selectedPageId: prev.pages[idx - 1].id, selectedTextId: null };
      return prev;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setState(prev => {
      const idx = prev.pages.findIndex(p => p.id === prev.selectedPageId);
      if (idx >= 0 && idx < prev.pages.length - 1) return { ...prev, selectedPageId: prev.pages[idx + 1].id, selectedTextId: null };
      return prev;
    });
  }, []);

  // Perbaikan Isolasi Local Style: Jika local active, tidak mengubah globalStyle
  const updateGlobalStyle = useCallback((newStyle: TextStyle) => {
    const { x, y } = getPosFromAlign(newStyle.alignment, newStyle.verticalAlignment);
    setState(prev => {
      const isLocalActive = prev.selectedPageId && prev.pages.find(p => p.id === prev.selectedPageId)?.isLocalStyle;
      
      const newPages = prev.pages.map(page => {
        if (isLocalActive) {
          // Hanya update halaman yang sedang dipilih jika Local Style aktif
          if (page.id !== prev.selectedPageId) return page;
          return { ...page, localStyle: newStyle, textObjects: page.textObjects.map(obj => ({ ...obj, ...newStyle, x, y })) };
        }
        // Jika Local Style halaman lain aktif, jangan timpa dengan global update
        if (page.isLocalStyle) return page;
        // Update halaman global biasa
        return { ...page, textObjects: page.textObjects.map(obj => ({ ...obj, ...newStyle, x, y })) };
      });

      return { 
        ...prev, 
        globalStyle: isLocalActive ? prev.globalStyle : newStyle, 
        pages: newPages 
      };
    });
  }, []);

  const toggleLocalSettings = useCallback((pageId: string) => {
    recordHistory();
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => {
        if (p.id !== pageId) return p;
        const status = !p.isLocalStyle;
        return { ...p, isLocalStyle: status, localStyle: status ? JSON.parse(JSON.stringify(prev.globalStyle)) : undefined };
      })
    }));
  }, [recordHistory]);

  const renderToStaticCanvas = async (page: Page) => {
    const tempCanvas = document.createElement('canvas');
    const staticCanvas = new fabric.StaticCanvas(tempCanvas);
    
    return new Promise<string>((resolve) => {
      fabric.Image.fromURL(page.imageUrl, (img: any) => {
        const originalWidth = img.width;
        const originalHeight = img.height;
        staticCanvas.setDimensions({ width: originalWidth, height: originalHeight });
        staticCanvas.setBackgroundImage(img, staticCanvas.renderAll.bind(staticCanvas));
        
        const scalingFactor = originalWidth / previewWidth;

        page.textObjects.forEach((obj) => {
          const displayContent = cleanText(obj.originalText, state.hideLabels);
          const finalWidth = state.importMode === 'full' 
            ? originalWidth - ((obj.paddingLeft + obj.paddingRight + 40) * scalingFactor)
            : obj.width * scalingFactor;

          const fabricObj = new fabric.Textbox(displayContent, {
            left: (obj.x / 100) * originalWidth,
            top: (obj.y / 100) * originalHeight,
            width: finalWidth,
            fontSize: obj.fontSize * scalingFactor,
            padding: 0,
            fill: obj.color,
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            stroke: obj.outlineColor,
            strokeWidth: obj.outlineWidth * scalingFactor,
            strokeUniform: true,
            paintFirst: 'stroke',
            fontFamily: obj.fontFamily || 'Inter',
            shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur * scalingFactor, offsetX: 0, offsetY: 0, opacity: obj.glowOpacity, nonScaling: true })
          });
          staticCanvas.add(fabricObj);
        });
        
        staticCanvas.renderAll();
        const dataUrl = staticCanvas.toDataURL({ format: 'jpeg', quality: 0.85 });
        staticCanvas.dispose();
        resolve(dataUrl);
      });
    });
  };

  const handleDownloadSinglePage = async () => {
    if (!selectedPage) return;
    setIsExporting(true);
    try {
      const dataUrl = await renderToStaticCanvas(selectedPage);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `page_${currentPageIndex + 1}_${selectedPage.fileName.split('.')[0]}.jpg`;
      link.click();
    } catch (e) { alert("Download failed"); } finally { setIsExporting(false); }
  };

  const handleExportZip = async () => {
    if (state.pages.length === 0) return;
    setIsExporting(true);
    const zip = new JSZip();
    try {
      for (let i = 0; i < state.pages.length; i++) {
        const page = state.pages[i];
        const dataUrl = await renderToStaticCanvas(page);
        zip.file(`${String(i + 1).padStart(3, '0')}_${page.fileName.split('.')[0]}.jpg`, dataUrl.split(',')[1], { base64: true });
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `comic_export_${new Date().getTime()}.zip`;
      link.click();
    } catch (e) { alert("ZIP Export failed"); } finally { setIsExporting(false); }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} setState={setState} onTextImport={handleTextImport}
        onUpdateText={updatePageText} onAddText={addTextManually}
        onClearAll={clearAllData} onUpdateGlobalStyle={updateGlobalStyle}
        onExportZip={handleExportZip} onDownloadSingle={handleDownloadSinglePage}
        onToggleLocal={toggleLocalSettings} isExporting={isExporting}
      />
      <main className="flex-1 relative overflow-auto bg-slate-900 p-8">
        {state.pages.length === 0 ? (
          <div className="h-full w-full"> <Uploader onUpload={handleUpload} variant="full" /> </div>
        ) : (
          <>
            {state.isGalleryView ? (
              <Gallery pages={state.pages} hideLabels={state.hideLabels} onSelectPage={(id) => setState(prev => ({ ...prev, selectedPageId: id, isGalleryView: false }))} />
            ) : (
              <div className="h-full flex flex-col items-center">
                <div className="mb-4 flex items-center gap-4 w-full justify-between bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setState(prev => ({ ...prev, isGalleryView: true, selectedPageId: null, selectedTextId: null }))} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">← Back</button>
                    <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
                    <button onClick={goToPrevPage} disabled={currentPageIndex <= 0} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Prev"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <button onClick={goToNextPage} disabled={currentPageIndex >= state.pages.length - 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Next"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                    <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
                    <button onClick={undo} disabled={history.past.length === 0} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Undo"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                    <button onClick={redo} disabled={history.future.length === 0} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Redo"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg></button>
                  </div>
                  <div className="flex items-center gap-3"><div className="text-right"><p className="text-[10px] text-slate-500 font-bold uppercase">{selectedPage?.fileName}</p><p className="text-[10px] text-blue-500">Page {currentPageIndex + 1}</p></div></div>
                </div>
                {selectedPage && <Editor key={selectedPage.id} page={selectedPage} hideLabels={state.hideLabels} importMode={state.importMode} onUpdateText={(id, upd) => updatePageText(selectedPage.id, id, upd)} selectedTextId={state.selectedTextId} onSelectText={handleSelectText} onRecordHistory={recordHistory} onResize={setPreviewWidth} />}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;