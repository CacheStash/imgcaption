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
      selectedTextIds: [], // Diubah menjadi array
      selectedMaskIds: [], // Diubah menjadi array
      isGalleryView: true, globalStyle: DEFAULT_STYLE, savedStyles: [],
      isSmartFillMode: false // Default off
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed, isGalleryView: true, selectedPageId: null, isSmartFillMode: false };
      } catch(e) { return initial; }
    }
    return initial;
  });

  const selectedPage = useMemo(() => state.pages.find(p => p.id === state.selectedPageId), [state.pages, state.selectedPageId]);
  const currentPageIndex = useMemo(() => state.pages.findIndex(p => p.id === state.selectedPageId), [state.pages, state.selectedPageId]);

  // FIX: Kalkulasi Mode Efektif (Local vs Global) untuk dikirim ke Editor
  const effectiveImportMode = useMemo(() => {
    if (selectedPage?.isLocalStyle && selectedPage.importMode) return selectedPage.importMode;
    return state.importMode;
  }, [selectedPage, state.importMode]);

  const recordHistory = useCallback(() => {
    setHistory(prev => ({ past: [...prev.past, JSON.parse(JSON.stringify(state.pages))], future: [] }));
  }, [state.pages]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory(prev => ({ past: prev.past.slice(0, -1), future: [state.pages, ...prev.future] }));
    setState(prev => ({ ...prev, pages: previous }));
  }, [history, state.pages]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory(prev => ({ past: [...history.past, state.pages], future: prev.future.slice(1) }));
    setState(prev => ({ ...prev, pages: next }));
  }, [history, state.pages]);

  // FITUR: Hapus Layer Spesifik (untuk Layer Manager)
  const deleteObjectById = useCallback((id: string) => {
    if (!state.selectedPageId) return;
    recordHistory();
    setState(prev => ({
      ...prev,
      selectedTextIds: prev.selectedTextIds.filter(tid => tid !== id),
      selectedMaskIds: prev.selectedMaskIds.filter(mid => mid !== id),
      pages: prev.pages.map(p => p.id === prev.selectedPageId ? {
        ...p,
        textObjects: p.textObjects.filter(t => t.id !== id),
        masks: (p.masks || []).filter(m => m.id !== id)
      } : p)
    }));
  }, [state.selectedPageId, recordHistory]);

  // FITUR: Visibility Toggle (Eye Button)
  const toggleObjectVisibility = useCallback((id: string) => {
    if (!state.selectedPageId) return;
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === prev.selectedPageId ? {
        ...p,
        textObjects: p.textObjects.map(t => t.id === id ? { ...t, visible: t.visible === false } : t),
        masks: (p.masks || []).map(m => m.id === id ? { ...m, visible: m.visible === false } : m)
      } : p)
    }));
  }, [state.selectedPageId]);

  // FITUR: Duplikasi Layer
  const duplicateSelectedElement = useCallback(() => {
    if (!selectedPage) return;
    const textsToDup = selectedPage.textObjects.filter(t => state.selectedTextIds.includes(t.id));
    const masksToDup = (selectedPage.masks || []).filter(m => state.selectedMaskIds.includes(m.id));
    
    if (textsToDup.length === 0 && masksToDup.length === 0) return;
    recordHistory();

    const newTextObjs = textsToDup.map(t => ({ ...t, id: generateId(), x: t.x + 5, y: t.y + 5 }));
    const newMaskObjs = masksToDup.map(m => ({ ...m, id: generateId(), x: m.x + 5, y: m.y + 5 }));

    setState(prev => ({
      ...prev,
      selectedTextIds: newTextObjs.map(t => t.id),
      selectedMaskIds: newMaskObjs.map(m => m.id),
      pages: prev.pages.map(p => p.id === selectedPage.id ? {
        ...p,
        textObjects: [...p.textObjects, ...newTextObjs],
        masks: [...(p.masks || []), ...newMaskObjs]
      } : p)
    }));
  }, [selectedPage, state.selectedTextIds, state.selectedMaskIds, recordHistory]);
  // FIX: Delete Key (Surgical Fix)
  const deleteSelectedElement = useCallback(() => {
    if (!state.selectedPageId) return;
    if (state.selectedTextIds.length === 0 && state.selectedMaskIds.length === 0) return;

    recordHistory();
    setState(prev => ({
      ...prev,
      selectedTextIds: [],
      selectedMaskIds: [],
      pages: prev.pages.map(p => (p.id === prev.selectedPageId) ? { 
          ...p, 
          textObjects: p.textObjects.filter(t => !prev.selectedTextIds.includes(t.id)),
          masks: (p.masks || []).filter(m => !prev.selectedMaskIds.includes(m.id))
        } : p)
    }));
  }, [state.selectedPageId, state.selectedTextIds, state.selectedMaskIds, recordHistory]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
      if (isTyping) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      
      // FIX: Tambahkan preventDefault untuk Delete dan Backspace agar berfungsi maksimal
      if (e.key === 'Delete' || e.key === 'Backspace') { 
        e.preventDefault(); 
        deleteSelectedElement(); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelectedElement]);

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
          // FIX: Gunakan mode lokal jika ada
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
      if (!page) return prev;
      const style = page.isLocalStyle && page.localStyle ? page.localStyle : prev.globalStyle;
      const mode = page.isLocalStyle && page.importMode ? page.importMode : prev.importMode;
      return {
        ...prev,
        pages: prev.pages.map(p => (p.id === pageId) ? { 
          ...p, textObjects: [...p.textObjects, createDefaultTextObject("New Dialogue", style, mode)] 
        } : p),
        selectedTextIds: [], // Dikosongkan agar tidak konflik dengan objek baru
        selectedMaskIds: []
      };
    });
  }, [recordHistory]);

  // FIX: Fungsi split diletakkan mandiri (tidak di dalam addTextManually)
  const splitSelectedText = useCallback(() => {
    if (!selectedPage || state.selectedTextIds.length === 0) return;
    const textObj = selectedPage.textObjects.find(t => t.id === state.selectedTextIds[0]);
    if (!textObj) return;

    // Logika Pecah Box: Pisahkan berdasarkan tanda koma ( , ) atau baris baru
    const parts = textObj.originalText.split(/ , /).map(p => p.trim()).filter(p => p.length > 0);
    const lines = parts.length > 1 ? parts : textObj.originalText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length <= 1) return; 

    recordHistory();
    const newObjects: TextObject[] = lines.map((line, idx) => ({
      ...textObj,
      id: generateId(),
      originalText: line,
      y: Math.min(95, textObj.y + (idx * 3)),
      height: undefined 
    } as TextObject));

    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === selectedPage.id ? {
        ...p,
        textObjects: [...p.textObjects.filter(t => t.id !== textObj.id), ...newObjects]
      } : p)
    }));
}, [selectedPage, state.selectedTextIds, recordHistory]);

  // FITUR 3: Handler Tambah Masker Pintar (Smart Bucket)
  const addSmartMask = useCallback((pageId: string, maskData: MaskObject) => {
    recordHistory();
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, masks: [...(p.masks || []), maskData] } : p),
    selectedTextIds: [],
      selectedMaskIds: [maskData.id]
      
    }));
  }, [recordHistory]);

  // FIX: Handler Add Mask
  const addMaskManually = useCallback((pageId: string, shape: 'rect' | 'oval' = 'rect') => {
    recordHistory();
    const newMask: MaskObject = { 
      id: generateId(), x: 50, y: 50, width: 200, height: 100, 
      fill: '#FFFFFF', 
      shape: shape, // FIX: Menggunakan parameter dari fungsi
      stroke: '#000000', 
      strokeWidth: 0 
    };
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, masks: [...(p.masks || []), newMask] } : p),
      selectedTextId: null,
      selectedMaskId: newMask.id
    }));
  }, [recordHistory]);

  // FIX: Handler Update Mask
  const updateMask = useCallback((pageId: string, maskId: string, updates: Partial<MaskObject>) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? {
        ...p, masks: (p.masks || []).map(m => m.id === maskId ? { ...m, ...updates } : m)
      } : p)
    }));
  }, []);

  const updateGlobalStyle = useCallback((newStyle: TextStyle) => {
    const { x, y } = getPosFromAlign(newStyle.alignment, newStyle.verticalAlignment, state.importMode);
    setState(prev => {
      const isLocal = prev.selectedPageId && prev.pages.find(p => p.id === prev.selectedPageId)?.isLocalStyle;
      const newPages = prev.pages.map(page => {
        // Jika sedang mode lokal, hanya update halaman terpilih
        if (isLocal && page.id === prev.selectedPageId) {
          return { 
            ...page, 
            localStyle: newStyle, 
            // FIX: Hanya spread gaya baru tanpa mereset koordinat x dan y yang sudah ada
            textObjects: page.textObjects.map(obj => ({ ...obj, ...newStyle })) 
          };
        }
        // Jika halaman punya gaya lokal sendiri, lewati (jangan timpa gaya global)
        if (page.isLocalStyle) return page;
        // Update halaman global (hanya yang tidak punya local style)
        return { 
          ...page, 
          textObjects: page.textObjects.map(obj => ({ ...obj, ...newStyle })) 
        };
      });
      return { ...prev, globalStyle: isLocal ? prev.globalStyle : newStyle, pages: newPages };
    });
  }, []);

  const toggleLocalSettings = useCallback((pageId: string) => {
    recordHistory();
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => (p.id === pageId) ? {
        ...p, 
        isLocalStyle: !p.isLocalStyle, 
        // FIX: Copy juga importMode saat menyalakan local style
        localStyle: !p.isLocalStyle ? JSON.parse(JSON.stringify(prev.globalStyle)) : undefined,
        importMode: !p.isLocalStyle ? prev.importMode : undefined
      } : p)
    }));
  }, [recordHistory]);

  // Helper untuk Auto Activate Local (FIX Poin 4)
  const activatePageLocal = (page: Page, globalStyle: TextStyle, globalMode: ImportMode): Page => {
    if (page.isLocalStyle === undefined) {
      return { 
        ...page, isLocalStyle: true, 
        localStyle: JSON.parse(JSON.stringify(globalStyle)),
        importMode: globalMode 
      };
    }
    return page;
  };

  const goToPrevPage = useCallback(() => {
    setState(prev => {
      const idx = prev.pages.findIndex(p => p.id === prev.selectedPageId);
      if (idx > 0) {
        const target = prev.pages[idx - 1];
        return { 
          ...prev, selectedPageId: target.id, selectedTextId: null, 
          pages: prev.pages.map(p => p.id === target.id ? activatePageLocal(p, prev.globalStyle, prev.importMode) : p) 
        };
      }
      return prev;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setState(prev => {
      const idx = prev.pages.findIndex(p => p.id === prev.selectedPageId);
      if (idx >= 0 && idx < prev.pages.length - 1) {
        const target = prev.pages[idx + 1];
        return { 
          ...prev, selectedPageId: target.id, selectedTextId: null, 
          pages: prev.pages.map(p => p.id === target.id ? activatePageLocal(p, prev.globalStyle, prev.importMode) : p) 
        };
      }
      return prev;
    });
  }, []);

  const handleSelectPage = useCallback((id: string) => {
    setState(prev => ({ 
      ...prev, selectedPageId: id, isGalleryView: false, 
      pages: prev.pages.map(p => p.id === id ? activatePageLocal(p, prev.globalStyle, prev.importMode) : p) 
    }));
  }, []);

  // FIX: Poin 3 (Export Sync)
  const renderToStaticCanvas = async (page: Page) => {
    const tempCanvas = document.createElement('canvas');
    const staticCanvas = new fabric.StaticCanvas(tempCanvas);
    return new Promise<string>((resolve) => {
      fabric.Image.fromURL(page.imageUrl, async (img: any) => {
        const oW = img.width; const oH = img.height;
        staticCanvas.setDimensions({ width: oW, height: oH });
        staticCanvas.setBackgroundImage(img, staticCanvas.renderAll.bind(staticCanvas));
        const scale = oW / previewWidth;
        
        // Tentukan mode halaman untuk export
        const pageMode = page.isLocalStyle && page.importMode ? page.importMode : state.importMode;

        // Render Masker (Manual & Smart Fill)
        const maskPromises = (page.masks || []).map(m => {
          if (m.visible === false) return Promise.resolve(); // Hormati fitur Hide
          
          if (m.type === 'image' && m.maskDataUrl) {
            // Render Smart Fill Image
            return new Promise<void>((res) => {
              fabric.Image.fromURL(m.maskDataUrl, (maskImg: any) => {
                maskImg.set({ 
                  left: 0, top: 0, scaleX: oW / maskImg.width, scaleY: oH / maskImg.height,
                  opacity: m.opacity ?? 1
                });
                staticCanvas.add(maskImg);
                staticCanvas.sendToBack(maskImg);
                res();
              }, { crossOrigin: 'anonymous' });
            });
          } else {
            // Render Manual Shape (Rect / Oval)
            const mProps = {
              left: (m.x/100)*oW, top: (m.y/100)*oH, 
              width: m.width*scale, height: m.height*scale, 
              fill: m.fill, originX: 'center', originY: 'center',
              opacity: m.opacity ?? 1,
              stroke: m.stroke || '#000000',
              strokeWidth: (m.strokeWidth || 0) * scale // Skala outline mengikuti gambar
            };
            const shapeObj = m.shape === 'oval' 
              ? new fabric.Ellipse({ ...mProps, rx: mProps.width/2, ry: mProps.height/2 })
              : new fabric.Rect(mProps);
            staticCanvas.add(shapeObj);
            staticCanvas.sendToBack(shapeObj);
            return Promise.resolve();
          }
        });

        await Promise.all(maskPromises);

        // Render Text Objects
        page.textObjects.forEach((obj) => {
          if (obj.visible === false) return; // Hormati fitur Hide
          const content = cleanText(obj.originalText, state.hideLabels);
          const fWidth = pageMode === 'full' ? oW - ((obj.paddingLeft + obj.paddingRight + 40)*scale) : obj.width*scale;
          
          const fObj = new fabric.Textbox(content, { 
            width: fWidth, fontSize: obj.fontSize*scale, fill: obj.color, 
            textAlign: 'center', originX: 'center', originY: 'center', 
            fontWeight: obj.fontWeight || 'normal',
            stroke: obj.outlineColor, strokeWidth: obj.outlineWidth*scale, 
            fontFamily: obj.fontFamily || 'Inter', strokeUniform: true, paintFirst: 'stroke', 
            strokeLineJoin: 'round', // FIX: Match editor's rounded stroke appearance
            shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur*scale, opacity: obj.glowOpacity }) 
          });
          
          fObj.setCoords();
          
          // SINKRONISASI POSISI DENGAN EDITOR
          const posX = (obj.x / 100) * oW;
          const posY = (obj.y / 100) * oH;
          
          // Logika Clamping (Hanya Y untuk mencegah nabrak bawah, sesuai Editor)
          const halfH = fObj.height / 2;
          const maxTop = oH - (obj.paddingBottom * scale) - halfH;
          const minTop = (obj.paddingTop * scale) + halfH;
          
          let safeTop = posY;
          if (safeTop > maxTop) safeTop = maxTop;
          if (safeTop < minTop) safeTop = minTop;
          
          fObj.set({ 
            left: posX, 
            top: safeTop 
          });
          staticCanvas.add(fObj);
        });
        
        staticCanvas.renderAll();
        // Beri jeda sedikit agar rendering browser selesai
        setTimeout(() => {
          resolve(staticCanvas.toDataURL({ format: 'jpeg', quality: 0.85 }));
          staticCanvas.dispose();
        }, 150);
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

  const clearAllData = useCallback(() => {
    if (window.confirm("Delete everything?")) { recordHistory(); setState(prev => ({ ...prev, pages: [], selectedPageId: null, isGalleryView: true })); }
  }, [recordHistory]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar 
        state={state} setState={setState} onTextImport={handleTextImport}
        onUpdateText={updatePageText} onAddText={addTextManually} onAddMask={addMaskManually} onUpdateMask={updateMask}
        onClearAll={clearAllData} onUpdateGlobalStyle={updateGlobalStyle}
        onExportZip={handleExportZip} onDownloadSingle={handleDownloadSinglePage}
        onToggleLocal={toggleLocalSettings} isExporting={isExporting}
        onSplitText={splitSelectedText}
        onDuplicate={duplicateSelectedElement}
        onDeleteLayer={deleteObjectById}
        onToggleVisibility={toggleObjectVisibility}
      />
        <main className="flex-1 relative overflow-hidden bg-slate-900 flex flex-col">
        {state.pages.length === 0 ? (
          <div className="h-full flex-1 flex items-center justify-center"><Uploader onUpload={handleUpload} /></div>
        ) : (
          <div className="flex-1 flex flex-col h-full p-6 overflow-hidden">
            {state.isGalleryView ? (
              <div className="overflow-auto h-full">
                <Gallery pages={state.pages} hideLabels={state.hideLabels} onSelectPage={handleSelectPage} />
              </div>
            ) : (
              <div className="flex flex-col h-full gap-4 overflow-hidden">
                {/* BARIS 1: NAVIGASI UTAMA */}
                <div className="shrink-0 flex items-center gap-4 w-full justify-between bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setState(prev => ({ ...prev, isGalleryView: true, selectedPageId: null, selectedTextIds: [], selectedMaskIds: [] }))} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">← Back</button>
                        {/* ... (lanjutkan sisa tombol navigasi Anda di sini) ... */}
                        <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
                        <button onClick={goToPrevPage} disabled={currentPageIndex <= 0} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                        <button onClick={goToNextPage} disabled={currentPageIndex >= state.pages.length - 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                    </div>
                    <div className="flex items-center gap-3 pr-4 text-right">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedPage?.fileName}</p>
                        <p className="text-[10px] text-blue-500">Page {currentPageIndex + 1}</p>
                      </div>
                    </div>
                </div>

                {/* BARIS 2: TOOLBAR SETTINGS (STYLE & TOOLS DARI SIDEBAR) */}
                {selectedPage && (
                  <div id="editor-horizontal-toolbar" className="shrink-0 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 shadow-2xl overflow-x-auto">
                    {/* Area ini akan diisi oleh konten Sidebar pada langkah berikutnya */}
                    <div className="flex items-start gap-8 min-w-max px-2">
                       <p className="text-[10px] text-slate-500 italic">Settings & Tools moved here...</p>
                    </div>
                  </div>
                )}

                {/* BARIS 3: CANVAS EDITOR */}
                <div className="flex-1 relative min-h-0 bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800/50">
                  {selectedPage && (
                    <Editor 
                      key={selectedPage.id} 
                      page={selectedPage} 
                      hideLabels={state.hideLabels} 
                      importMode={effectiveImportMode} 
                      onUpdateText={(id, upd) => updatePageText(selectedPage.id, id, upd)} 
                      onUpdateMask={(id, upd) => updateMask(selectedPage.id, id, upd)}
                      selectedTextIds={state.selectedTextIds} 
                      selectedMaskIds={state.selectedMaskIds}
                      onSelectText={ids => setState(p => ({ ...p, selectedTextIds: Array.isArray(ids) ? ids : (ids ? [ids] : []), selectedMaskIds: [] }))}
                      onSelectMask={ids => setState(p => ({ ...p, selectedMaskIds: Array.isArray(ids) ? ids : (ids ? [ids] : []), selectedTextIds: [] }))}
                      onRecordHistory={recordHistory} 
                      onResize={setPreviewWidth} 
                      isSmartFill={state.isSmartFillMode}
                      onAddSmartMask={(mask) => addSmartMask(selectedPage.id, mask)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;