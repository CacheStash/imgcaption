import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, TextObject, AppState, TextStyle } from './types';
import { generateId, parseRawText, createDefaultTextObject, DEFAULT_STYLE, loadPageFromCache, savePageToCache, cleanText } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Gallery from './components/Gallery';
import Editor from './components/Editor';
import Uploader from './components/Uploader';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

declare const fabric: any;

const App: React.FC = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Indie+Flower&family=Inter:wght@400;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

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

  const handleUpload = useCallback((files: File[]) => {
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const newPages: Page[] = sortedFiles.map((file) => {
      const cached = loadPageFromCache(file.name, file.size);
      return { id: generateId(), imageUrl: URL.createObjectURL(file), fileName: file.name, fileSize: file.size, textObjects: cached?.textObjects || [], bubbles: [], overrideStyle: cached?.overrideStyle };
    });
    setState(prev => ({ ...prev, pages: [...prev.pages, ...newPages] }));
  }, []);

  const selectedPageIndex = useMemo(() => state.pages.findIndex(p => p.id === state.selectedPageId), [state.pages, state.selectedPageId]);
  const selectedPage = state.pages[selectedPageIndex] || null;

  const navigatePage = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? selectedPageIndex + 1 : selectedPageIndex - 1;
    if (newIndex >= 0 && newIndex < state.pages.length) {
      setState(prev => ({ ...prev, selectedPageId: state.pages[newIndex].id, selectedTextId: null }));
    }
  };

  const handleExportImages = async () => {
    if (state.pages.length === 0) return;
    const zip = new JSZip();
    const tempCanvas = document.createElement('canvas');
    const fCanvas = new fabric.StaticCanvas(tempCanvas);

    for (const page of state.pages) {
      await new Promise<void>((resolve) => {
        fabric.Image.fromURL(page.imageUrl, (img: any) => {
          const originalW = img.width;
          const originalH = img.height;
          fCanvas.setDimensions({ width: originalW, height: originalH });
          fCanvas.setBackgroundImage(img, () => {
            const style = page.overrideStyle || state.globalStyle;
            
            // Hitung total height untuk auto-layout vertikal
            const autoTexts = page.textObjects.filter(t => !t.isManuallyPlaced);
            const scaleFactor = originalW / 800; 
            const padding = style.padding * scaleFactor;
            const gap = 15 * scaleFactor;
            
            // Render objek teks
            page.textObjects.forEach((obj, idx) => {
              const boxWidth = style.boxType === 'caption' ? originalW - (padding * 2) : 320 * scaleFactor;
              const tBox = new fabric.Textbox(cleanText(obj.originalText, state.hideLabels), {
                width: boxWidth, fontSize: style.fontSize * scaleFactor, fill: style.color,
                textAlign: style.alignment, fontFamily: style.fontFamily,
                stroke: style.outlineColor, strokeWidth: style.outlineWidth * scaleFactor,
                strokeUniform: true, paintFirst: 'stroke',
                shadow: new fabric.Shadow({ color: style.glowColor, blur: style.glowBlur * scaleFactor })
              });

              if (obj.isManuallyPlaced) {
                tBox.set({ left: obj.x * originalW, top: obj.y * originalH });
              } else {
                // Sederhanakan posisi vertikal untuk export (bisa dikembangkan lebih lanjut)
                tBox.set({ left: padding, top: padding + (idx * (tBox.height + gap)) });
              }
              fCanvas.add(tBox);
            });

            fCanvas.renderAll();
            const dataUrl = fCanvas.toDataURL({ format: 'jpeg', quality: 0.95 });
            zip.file(`edited_${page.fileName}`, dataUrl.split(',')[1], { base64: true });
            fCanvas.clear();
            resolve();
          });
        }, { crossOrigin: 'anonymous' });
      });
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `ZenReader_Export_${new Date().getTime()}.zip`);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-inter">
      <Sidebar 
        state={state} setState={setState} 
        onExport={handleExportImages}
        onTextImport={(txt) => {
          const data = parseRawText(txt);
          setState(prev => ({ ...prev, pages: prev.pages.map((p, i) => data[i+1] ? {...p, textObjects: data[i+1].map(t => createDefaultTextObject(t, prev.globalStyle))} : p) }));
        }}
        onUpdateText={(pId, tId, updates) => setState(prev => ({...prev, pages: prev.pages.map(p => p.id === pId ? {...p, textObjects: p.textObjects.map(t => t.id === tId ? {...t, ...updates} : t)} : p)}))}
        onAddText={(pId) => setState(prev => ({ ...prev, pages: prev.pages.map(p => p.id === pId ? { ...p, textObjects: [...p.textObjects, createDefaultTextObject("New Box", prev.globalStyle)]} : p)}))}
        onClearAll={() => { localStorage.clear(); window.location.reload(); }}
        onUpdateGlobalStyle={(s) => setState(p => ({ ...p, globalStyle: s }))}
        onUpdatePageStyle={(s) => selectedPage && setState(prev => ({...prev, pages: prev.pages.map(p => p.id === selectedPage.id ? {...p, overrideStyle: s} : p)}))}
      />
      <main className={`flex-1 relative overflow-auto bg-slate-900 p-8 shadow-inner ${state.pages.length === 0 ? 'flex items-center justify-center' : ''}`}>
        {state.pages.length === 0 ? <Uploader onUpload={handleUpload} /> : (
          state.isGalleryView ? <Gallery pages={state.pages} hideLabels={state.hideLabels} onSelectPage={(id) => setState(p => ({ ...p, selectedPageId: id, isGalleryView: false }))} /> : (
            <div className="h-full flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-6 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <button onClick={() => setState(prev => ({ ...prev, isGalleryView: true }))} className="px-4 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600 transition-colors">← Back</button>
                <span className="text-xs font-mono text-slate-500">Page {selectedPageIndex + 1} / {state.pages.length}</span>
              </div>
              
              <div className="flex-1 w-full flex items-center justify-center relative gap-8">
                {/* FLOATING NAVIGATION */}
                <button onClick={() => navigatePage('prev')} disabled={selectedPageIndex === 0} className="p-4 bg-slate-800 hover:bg-blue-600 disabled:opacity-20 rounded-full shadow-2xl z-30 transition-all border border-slate-700">PREV</button>
                
                {selectedPage && (
                  <Editor 
                    key={selectedPage.id}
                    page={selectedPage} 
                    hideLabels={state.hideLabels}
                    globalStyle={state.globalStyle}
                    selectedTextId={state.selectedTextId}
                    onUpdateText={(tId, updates) => setState(prev => ({...prev, pages: prev.pages.map(p => p.id === selectedPage.id ? {...p, textObjects: p.textObjects.map(t => t.id === tId ? {...t, ...updates} : t)} : p)}))}
                    onSelectText={(id) => setState(prev => ({ ...prev, selectedTextId: id }))}
                    onUpdateOverride={(s) => setState(prev => ({...prev, pages: prev.pages.map(p => p.id === selectedPage.id ? {...p, overrideStyle: s} : p)}))}
                  />
                )}

                <button onClick={() => navigatePage('next')} disabled={selectedPageIndex === state.pages.length - 1} className="p-4 bg-slate-800 hover:bg-blue-600 disabled:opacity-20 rounded-full shadow-2xl z-30 transition-all border border-slate-700">NEXT</button>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;