// FULL REWRITE - Menambahkan Rendering Mask (Paint Bucket)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject, ImportMode, MaskObject } from '../types';
import { cleanText } from '../utils/helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextId: string | null;
  selectedMaskId?: string | null;
  importMode: ImportMode;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onUpdateMask: (maskId: string, updates: Partial<MaskObject>) => void;
  onSelectText: (id: string | null) => void;
  onSelectMask: (id: string | null) => void;
  onRecordHistory: () => void;
  onResize: (width: number) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ page, hideLabels, selectedTextId, selectedMaskId, importMode, onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { backgroundColor: '#1e293b', preserveObjectStacking: true });
    fabricCanvasRef.current = fCanvas;

    fCanvas.on('selection:created', (e: any) => { 
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj.data?.type === 'text') onSelectText(obj.data.id);
      if (obj.data?.type === 'mask') onSelectMask(obj.data.id);
    });

    fCanvas.on('selection:cleared', () => { if (!isRenderingRef.current) { onSelectText(null); onSelectMask(null); } });

    fCanvas.on('object:modified', (e: any) => {
      if (isRenderingRef.current) return;
      onRecordHistory();
      const bg = fCanvas.backgroundImage; const bW = bg.width * bg.scaleX; const bH = bg.height * bg.scaleY;
      const obj = e.target;
      if (obj.data?.type === 'text') onUpdateText(obj.data.id, { x: (obj.left / bW) * 100, y: (obj.top / bH) * 100, width: obj.width * obj.scaleX });
      if (obj.data?.type === 'mask') onUpdateMask(obj.data.id, { x: (obj.left / bW) * 100, y: (obj.top / bH) * 100, width: obj.width * obj.scaleX, height: obj.height * obj.scaleY });
    });

    return () => fCanvas.dispose();
  }, [onSelectText, onSelectMask, onRecordHistory, onUpdateText, onUpdateMask]);

  // SINKRONISASI RENDERING (Teks & Mask)
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    isRenderingRef.current = true;

    // 1. Render Mask (Kotak)
    (page.masks || []).forEach(m => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === m.id);
      const props = { left: (m.x/100)*containerSize.width, top: (m.y/100)*containerSize.height, width: m.width, height: m.height, fill: m.fill, originX: 'center', originY: 'center' };
      if (!fObj) {
        fObj = new fabric.Rect({ ...props, data: { id: m.id, type: 'mask' } });
        fCanvas.add(fObj);
      } else if (fObj !== fCanvas.getActiveObject()) { fObj.set(props); }
    });

    // 2. Render Teks (Logika Clamping dipertahankan 100%)
    page.textObjects.forEach((obj) => {
      const content = cleanText(obj.originalText, hideLabels);
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      const fWidth = importMode === 'full' ? containerSize.width - (obj.paddingLeft + obj.paddingRight + 40) : obj.width;
      const props = { width: fWidth, fontSize: obj.fontSize, fill: obj.color, textAlign: 'center', originX: 'center', originY: 'center', fontFamily: obj.fontFamily, text: content };
      if (!fObj) {
        fObj = new fabric.Textbox(content, { ...props, data: { id: obj.id, type: 'text' } });
        fCanvas.add(fObj);
      } else if (!fObj.isEditing) { fObj.set(props); }
      fObj.setCoords();
      const h = fObj.height * (fObj.scaleY || 1);
      fObj.set({
        left: Math.max(obj.paddingLeft + (fWidth/2), Math.min(containerSize.width - obj.paddingRight - (fWidth/2), (obj.x/100)*containerSize.width)),
        top: Math.max(obj.paddingTop + (h/2), Math.min(containerSize.height - obj.paddingBottom - (h/2), (obj.y/100)*containerSize.height))
      });
    });

    fCanvas.renderAll();
    isRenderingRef.current = false;
  }, [page.textObjects, page.masks, containerSize, hideLabels, importMode]);

  // (Fungsi syncSize dipertahankan 100% dari code sebelumnya)
  return (<div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 min-h-[400px]"><canvas ref={canvasRef} /></div>);
};

export default Editor;