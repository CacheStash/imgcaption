import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, TextObject, AppState, TextStyle, ImportMode, MaskObject } from './types';
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
      pages: [], hideLabels: false, importMode: 'box', selectedPageId: null,
      selectedTextId: null, selectedMaskId: null, isGalleryView: true, globalStyle: DEFAULT_STYLE, savedStyles: [],
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed, isGalleryView: true, selectedPageId: null };
      } catch(e) { return initial; }
    }
    return initial;
  });

  const selectedPage = useMemo(() => state.pages.find(p => p.id === state.selectedPageId), [state.pages, state.selectedPageId]);
  const currentPageIndex = useMemo(() => state.pages.findIndex(p => p.id === state.selectedPageId), [state.pages, state.selectedPageId]);
  const effectiveImportMode = useMemo(() => (selectedPage?.isLocalStyle && selectedPage.importMode) ? selectedPage.importMode : state.importMode, [selectedPage, state.importMode]);

  const recordHistory = useCallback(() => {
    setHistory(prev => ({ past: [...prev.past, JSON.parse(JSON.stringify(state.pages))], future: [] }));
  }, [state.pages]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory({ past: history.past.slice(0, -1), future: [state.pages, ...history.future] });
    setState(prev => ({ ...prev, pages: previous }));
  }, [history, state.pages]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory({ past: [...history.past, state.pages], future: history.future.slice(1) });
    setState(prev => ({ ...prev, pages: next }));
  }, [history, state.pages]);

  const deleteSelectedElement = useCallback(() => {
    if (!state.selectedPageId) return;
    recordHistory();
    setState(prev => ({
      ...prev, selectedTextId: null, selectedMaskId: null,
      pages: prev.pages.map(p => (p.id === prev.selectedPageId) ? { 
          ...p, textObjects: p.textObjects.filter(t => t.id !== prev.selectedTextId),
          masks: (p.masks || []).filter(m => m.id !== prev.selectedMaskId)
        } : p)
    }));
  }, [state.selectedPageId, state.selectedTextId, state.selectedMaskId, recordHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
      if (isTyping) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelectedElement(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelectedElement]);

  const handleUpload = useCallback((files: File[]) => {
    recordHistory();
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    const newPages: Page[] = sorted.map(file => ({
      id: generateId(), imageUrl: URL.createObjectURL(file), fileName: file.name, textObjects: [], masks: []
    }));
    setState(prev => ({ ...prev, pages: [...prev.pages, ...newPages] }));
  }, [recordHistory]);

  const handleTextImport = useCallback((rawText: string) => {
    recordHistory();
    const parsedData = parseRawText(rawText, state.importMode);
    setState(prev => ({
      ...prev,
      pages: prev.pages.map((page, index) => {
        const pageNum = index + 1;
        if (parsedData[pageNum]) {
          const style = page.isLocalStyle && page.localStyle ? page.localStyle : prev.globalStyle;
          const mode = page.isLocalStyle && page.importMode ? page.importMode : state.importMode;
          const newObjects = parsedData[pageNum].map(txt => createDefaultTextObject(txt, style, mode));
          return { ...page, textObjects: [...page.textObjects, ...newObjects] };
        }
        return page;
      })
    }));
  }, [recordHistory, state.importMode]);

  const updatePageText = useCallback((pageId: string, textId: string, updates: Partial<TextObject>) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => (p.id === pageId) ? {
        ...p, textObjects: p.textObjects.map(t => t.id === textId ? { ...t, ...updates } : t)
      } : p)
    }));
  }, []);

  const addTextManually = useCallback((pageId: string) => {
    recordHistory();
    setState(prev => {
      const page = prev.pages.find(p => p.id === pageId);
      const style = page?.isLocalStyle && page.localStyle ? page.localStyle : prev.globalStyle;
      const mode = page?.isLocalStyle && page.importMode ? page.importMode : prev.importMode;
      const newObj = createDefaultTextObject("New Dialogue", style, mode);
      return {
        ...prev,
        pages: prev.pages.map(p => (p.id === pageId) ? { ...p, textObjects: [...p.textObjects, newObj] } : p),
        selectedTextId: null 
      };
    });
  }, [recordHistory]);

  const addMaskManually = useCallback((pageId: string) => {
    recordHistory();
    const newMask: MaskObject = { id: generateId(), x: 50, y: 50, width: 200, height: 100, fill: '#FFFFFF' };
    setState(prev => ({
      ...prev, pages: prev.pages.map(p => p.id === pageId ? { ...p, masks: [...(p.masks || []), newMask] } : p),
      selectedTextId: null, selectedMaskId: newMask.id
    }));
  }, [recordHistory]);

  const updateMask = useCallback((pageId: string, maskId: string, updates: Partial<MaskObject>) => {
    setState(prev => ({ ...prev, pages: prev.pages.map(p => p.id === pageId ? { ...p, masks: (p.masks || []).map(m => m.id === maskId ? { ...m, ...updates } : m) } : p) }));
  }, []);

  const toggleLocalSettings = useCallback((pageId: string) => {
    recordHistory();
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => (p.id === pageId) ? {
        ...p, isLocalStyle: !p.isLocalStyle, 
        localStyle: !p.isLocalStyle ? JSON.parse(JSON.stringify(prev.globalStyle)) : undefined,
        importMode: !p.isLocalStyle ? prev.importMode : undefined
      } : p)
    }));
  }, [recordHistory]);

  const activatePageLocal = (page: Page, globalStyle: TextStyle, globalMode: ImportMode): Page => {
    if (page.isLocalStyle === undefined) {
      return { ...page, isLocalStyle: true, localStyle: JSON.parse(JSON.stringify(globalStyle)), importMode: globalMode };
    }
    return page;
  };

  const handleSelectPage = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedPageId: id, isGalleryView: false, pages: prev.pages.map(p => p.id === id ? activatePageLocal(p, prev.globalStyle, prev.importMode) : p) }));
  }, []);

  const goToPrevPage = useCallback(() => {
    setState(prev => {
      const idx = prev.pages.findIndex(p => p.id === prev.selectedPageId);
      if (idx > 0) {
        const targetId = prev.pages[idx - 1].id;
        return { ...prev, selectedPageId: targetId, selectedTextId: null, pages: prev.pages.map(p => p.id === targetId ? activatePageLocal(p, prev.globalStyle, prev.importMode) : p) };
      }
      return prev;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setState(prev => {
      const idx = prev.pages.findIndex(p => p.id === prev.selectedPageId);
      if (idx >= 0 && idx < prev.pages.length - 1) {
        const targetId = prev.pages[idx + 1].id;
        return { ...prev, selectedPageId: targetId, selectedTextId: null, pages: prev.pages.map(p => p.id === targetId ? activatePageLocal(p, prev.globalStyle, prev.importMode) : p) };
      }
      return prev;
    });
  }, []);

  const updateGlobalStyle = useCallback((newStyle: TextStyle) => {
    const { x, y } = getPosFromAlign(newStyle.alignment, newStyle.verticalAlignment, state.importMode);
    setState(prev => {
      const isLocal = prev.selectedPageId && prev.pages.find(p => p.id === prev.selectedPageId)?.isLocalStyle;
      const newPages = prev.pages.map(page => {
        if (isLocal && page.id === prev.selectedPageId) return { ...page, localStyle: newStyle, textObjects: page.textObjects.map(obj => ({ ...obj, ...newStyle, x, y })) };
        if (page.isLocalStyle) return page;
        return { ...page, textObjects: page.textObjects.map(obj => ({ ...obj, ...newStyle, x, y })) };
      });
      return { ...prev, globalStyle: isLocal ? prev.globalStyle : newStyle, pages: newPages };
    });
  }, []);

  const renderToStaticCanvas = async (page: Page) => {
    const tempCanvas = document.createElement('canvas');
    const staticCanvas = new fabric.StaticCanvas(tempCanvas);
    return new Promise<string>((resolve) => {
      fabric.Image.fromURL(page.imageUrl, (img: any) => {
        const oW = img.width; const oH = img.height;
        staticCanvas.setDimensions({ width: oW, height: oH });
        staticCanvas.setBackgroundImage(img, staticCanvas.renderAll.bind(staticCanvas));
        const scale = oW / previewWidth;
        const pageMode = (page.isLocalStyle && page.importMode) ? page.importMode : state.importMode;

        (page.masks || []).forEach(m => { staticCanvas.add(new fabric.Rect({ left: (m.x/100)*oW, top: (m.y/100)*oH, width: m.width*scale, height: m.height*scale, fill: m.fill, originX: 'center', originY: 'center' })); });

        page.textObjects.forEach((obj) => {
          const content = cleanText(obj.originalText, state.hideLabels);
          const fWidth = pageMode === 'full' ? oW - ((obj.paddingLeft + obj.paddingRight + 40)*scale) : obj.width*scale;
          const fObj = new fabric.Textbox(content, { 
            width: fWidth, fontSize: obj.fontSize*scale, fill: obj.color, textAlign: 'center', 
            originX: 'center', originY: 'center', stroke: obj.outlineColor, strokeWidth: obj.outlineWidth*scale, 
            paintFirst: 'stroke', fontFamily: obj.fontFamily || 'Inter', strokeUniform: true, 
            shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur*scale, opacity: obj.glowOpacity }) 
          });

          if (obj.boxShape && obj.boxShape !== 'none') {
            const sW = fWidth + (obj.paddingLeft + obj.paddingRight)*scale; const sH = fObj.height + (obj.paddingTop + obj.paddingBottom)*scale;
            const sProps = { left: (obj.x/100)*oW, top: (obj.y/100)*oH, fill: obj.backgroundColor, originX: 'center', originY: 'center' };
            if (obj.boxShape === 'oval') staticCanvas.add(new fabric.Ellipse({ ...sProps, rx: sW/2, ry: sH/2 }));
            else staticCanvas.add(new fabric.Rect({ ...sProps, width: sW, height: sH, rx: obj.boxShape === 'rounded' ? 20*scale : 0, ry: obj.boxShape === 'rounded' ? 20*scale : 0 }));
          }
          
          fObj.setCoords();
          const minY = (obj.paddingTop * scale) + (fObj.height / 2); const maxY = oH - (obj.paddingBottom * scale) - (fObj.height / 2);
          fObj.set({ left: Math.max((obj.paddingLeft*scale)+(fWidth/2), Math.min(oW-(obj.paddingRight*scale)-(fWidth/2), (obj.x/100)*oW)), top: Math.max(minY, Math.min(maxY, (obj.y/100)*oH)) });
          staticCanvas.add(fObj);
        });
        staticCanvas.renderAll(); resolve(staticCanvas.toDataURL({ format: 'jpeg', quality: 0.85 })); staticCanvas.dispose();
      });
    });
  };

  const handleDownloadSinglePage = async () => {
    if (!selectedPage) return;
    setIsExporting(true);
    try {
      const dataUrl = await renderToStaticCanvas(selectedPage);
      const link = document.createElement('a');
      link.href = dataUrl; link.download = `page_${currentPageIndex + 1}_${selectedPage.fileName.split('.')[0]}.jpg`; link.click();
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
      link.href = URL.createObjectURL(content); link.download = `comic_export.zip`; link.click();
    } catch (e) { alert("ZIP Export failed"); } finally { setIsExporting(false); }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} setState={setState} onTextImport={handleTextImport}
        onUpdateText={updatePageText} onAddText={addTextManually} onAddMask={addMaskManually} onUpdateMask={updateMask}
        onClearAll={() => setState(prev => ({ ...prev, pages: [], selectedPageId: null, isGalleryView: true }))} onUpdateGlobalStyle={updateGlobalStyle}
        onExportZip={handleExportZip} onDownloadSingle={handleDownloadSinglePage}
        onToggleLocal={toggleLocalSettings} isExporting={isExporting}
      />
      <main className="flex-1 relative overflow-auto bg-slate-900 p-8">
        {state.pages.length === 0 ? <div className="h-full flex items-center justify-center"><Uploader onUpload={handleUpload} /></div> : (
          state.isGalleryView ? <Gallery pages={state.pages} hideLabels={state.hideLabels} onSelectPage={handleSelectPage} /> : (
            <div className="h-full flex flex-col items-center">
              <div className="mb-4 flex items-center gap-4 w-full justify-between bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <button onClick={() => setState(prev => ({ ...prev, isGalleryView: true, selectedPageId: null, selectedTextId: null, selectedMaskId: null }))} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">← Back</button>
                  <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
                  <button onClick={goToPrevPage} disabled={currentPageIndex <= 0} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Prev">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={goToNextPage} disabled={currentPageIndex >= state.pages.length - 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Next">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
                  <button onClick={undo} disabled={history.past.length === 0} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Undo">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button onClick={redo} disabled={history.future.length === 0} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all" title="Redo">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3"><div className="text-right"><p className="text-[10px] text-slate-500 font-bold uppercase">{selectedPage?.fileName}</p><p className="text-[10px] text-blue-500">Page {currentPageIndex + 1}</p></div></div>
              </div>
              {selectedPage && <Editor key={selectedPage.id} page={selectedPage} hideLabels={state.hideLabels} importMode={effectiveImportMode} onUpdateText={(id, upd) => updatePageText(selectedPage.id, id, upd)} onUpdateMask={(id, upd) => updateMask(selectedPage.id, id, upd)} selectedTextId={state.selectedTextId} selectedMaskId={state.selectedMaskId} onSelectText={id => setState(p => ({ ...p, selectedTextId: id, selectedMaskId: null }))} onSelectMask={id => setState(p => ({ ...p, selectedMaskId: id, selectedTextId: null }))} onRecordHistory={recordHistory} onResize={setPreviewWidth} />}
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;