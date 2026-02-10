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

const Editor: React.FC<EditorProps> = ({ 
  page, hideLabels, selectedTextId, selectedMaskId, importMode, 
  onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const callbacks = useRef({ onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize });
  useEffect(() => { callbacks.current = { onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize }; }, [onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize]);

  // FIX: Helper untuk Clamp (Anti-Nabrak Padding)
  const clampPosition = useCallback((obj: any, data: TextObject) => {
    if (!containerSize.width || !containerSize.height) return;
    const width = obj.width * obj.scaleX; const height = obj.height * obj.scaleY;
    const halfW = width/2; const halfH = height/2;
    const minLeft = data.paddingLeft + halfW;
    const maxLeft = containerSize.width - data.paddingRight - halfW;
    const minTop = data.paddingTop + halfH;
    const maxTop = containerSize.height - data.paddingBottom - halfH;
    let newLeft = obj.left; let newTop = obj.top;
    if (maxLeft > minLeft) newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    else newLeft = (minLeft + maxLeft) / 2;
    if (maxTop > minTop) newTop = Math.max(minTop, Math.min(newTop, maxTop));
    else newTop = (minTop + maxTop) / 2;
    if (newLeft !== obj.left || newTop !== obj.top) { obj.set({ left: newLeft, top: newTop }); obj.setCoords(); }
  }, [containerSize]);

  // FIX: Stacking Logic untuk Teks & Mask (Paint Bucket layer bawah)
  const resolveStacking = useCallback((fCanvas: any) => {
    fCanvas.getObjects().forEach((obj: any) => { if (obj.data?.type === 'mask') fCanvas.sendToBack(obj); });
    fCanvas.getObjects().forEach((obj: any) => { if (obj.data?.type === 'text') fCanvas.bringToFront(obj); });

    // Anti-Overlap Teks (Fitur Lama)
    const textboxes = fCanvas.getObjects().filter((o: any) => o.data?.id && o.data?.type === 'text');
    if (textboxes.length <= 1) return;
    textboxes.sort((a: any, b: any) => a.top - b.top);
    const PADDING = 15;
    let changed = false;
    for (let i = 0; i < textboxes.length; i++) {
      const current = textboxes[i];
      const currentRect = current.getBoundingRect();
      for (let j = 0; j < i; j++) {
        const above = textboxes[j];
        const aboveRect = above.getBoundingRect();
        const overlapX = (currentRect.left < aboveRect.left + aboveRect.width) && (currentRect.left + currentRect.width > aboveRect.left);
        if (overlapX && currentRect.top < aboveRect.top + aboveRect.height + PADDING) {
          current.set({ top: aboveRect.top + aboveRect.height + PADDING });
          current.setCoords();
          changed = true;
        }
      }
    }
    if (changed) fCanvas.requestRenderAll();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { backgroundColor: '#0f172a', preserveObjectStacking: true, selection: true });
    fabricCanvasRef.current = fCanvas;

    // Selection Handler (Teks atau Mask)
    fCanvas.on('selection:created', (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.selected ? e.selected[0] : e.target;
      if (obj?.data?.type === 'text') { callbacks.current.onSelectText(obj.data.id); callbacks.current.onSelectMask(null); }
      else if (obj?.data?.type === 'mask') { callbacks.current.onSelectMask(obj.data.id); callbacks.current.onSelectText(null); }
    });
    fCanvas.on('selection:updated', (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.selected ? e.selected[0] : e.target;
      if (obj?.data?.type === 'text') { callbacks.current.onSelectText(obj.data.id); callbacks.current.onSelectMask(null); }
      else if (obj?.data?.type === 'mask') { callbacks.current.onSelectMask(obj.data.id); callbacks.current.onSelectText(null); }
    });
    fCanvas.on('selection:cleared', () => { 
      if (!isRenderingRef.current) { callbacks.current.onSelectText(null); callbacks.current.onSelectMask(null); } 
    });

    // Modified Handler
    fCanvas.on('object:modified', (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
        callbacks.current.onRecordHistory();
        const bg = fCanvas.backgroundImage;
        const bW = bg ? bg.width * bg.scaleX : 1; const bH = bg ? bg.height * bg.scaleY : 1;
        if (obj.data.type === 'text') {
          const textData = page.textObjects.find(t => t.id === obj.data.id);
          if (textData) clampPosition(obj, textData);
          callbacks.current.onUpdateText(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width*obj.scaleX });
        } else if (obj.data.type === 'mask') {
          callbacks.current.onUpdateMask(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width*obj.scaleX, height: obj.height*obj.scaleY });
        }
        resolveStacking(fCanvas);
      }
    });

    fCanvas.on('text:changed', (e: any) => {
      if (isRenderingRef.current) return;
      if (e.target?.data?.type === 'text') {
        callbacks.current.onUpdateText(e.target.data.id, { originalText: e.target.text });
        resolveStacking(fCanvas);
      }
    });

    return () => { fCanvas.dispose(); fabricCanvasRef.current = null; };
  }, [resolveStacking, clampPosition, page.textObjects, page.masks]);

  // FIX: Poin 1 (Preview Image Loading)
  const syncCanvasSize = useCallback(() => {
    if (!containerRef.current || !fabricCanvasRef.current) return;
    const fCanvas = fabricCanvasRef.current;
    const { width: contWidth, height: contHeight } = containerRef.current.getBoundingClientRect();
    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!fCanvas || !img) return;
      const imgRatio = img.width / img.height; const containerRatio = contWidth / contHeight;
      let finalWidth, finalHeight;
      if (imgRatio > containerRatio) { finalWidth = contWidth; finalHeight = contWidth / imgRatio; }
      else { finalHeight = contHeight; finalWidth = contHeight * imgRatio; }
      fCanvas.setDimensions({ width: finalWidth, height: finalHeight });
      img.set({ scaleX: finalWidth/img.width, scaleY: finalHeight/img.height, left: 0, top: 0, selectable: false, evented: false });
      fCanvas.setBackgroundImage(img, () => {
        setContainerSize({ width: finalWidth, height: finalHeight });
        callbacks.current.onResize(finalWidth);
        fCanvas.requestRenderAll();
      });
    }, { crossOrigin: 'anonymous' }); 
  }, [page.imageUrl]);

  useEffect(() => {
    syncCanvasSize();
    const handleResize = () => syncCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [syncCanvasSize]);

  // Sync Objects
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    isRenderingRef.current = true;
    
    // Cleanup
    const textIds = page.textObjects.map(t => t.id);
    const maskIds = (page.masks || []).map(m => m.id);
    fCanvas.getObjects().forEach((obj: any) => {
      if (obj.data?.id) {
        if (obj.data.type === 'text' && !textIds.includes(obj.data.id)) fCanvas.remove(obj);
        if (obj.data.type === 'mask' && !maskIds.includes(obj.data.id)) fCanvas.remove(obj);
      }
    });

    // Render Masks
    (page.masks || []).forEach((mask) => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === mask.id);
      const props = { left: (mask.x/100)*containerSize.width, top: (mask.y/100)*containerSize.height, width: mask.width, height: mask.height, fill: mask.fill, originX: 'center', originY: 'center', strokeWidth: 0 };
      if (!fObj) {
        fObj = new fabric.Rect({ ...props, data: { id: mask.id, type: 'mask' } });
        fCanvas.add(fObj);
      } else if (fObj !== fCanvas.getActiveObject()) { fObj.set(props); }
    });

    // Render Texts
    page.textObjects.forEach((obj) => {
      const content = cleanText(obj.originalText, hideLabels);
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      const fWidth = importMode === 'full' ? containerSize.width - (obj.paddingLeft + obj.paddingRight + 40) : obj.width;
      const props = { width: fWidth, fontSize: obj.fontSize, fill: obj.color, textAlign: 'center', originX: 'center', originY: 'center', fontFamily: obj.fontFamily, text: content };
      
      if (!fObj) {
        fObj = new fabric.Textbox(content, { ...props, data: { id: obj.id, type: 'text' }, lockScalingY: true });
        fCanvas.add(fObj);
      } else {
        // FIX: Variable name correction here (fObj instead of fabricObj)
        if (fObj !== fCanvas.getActiveObject() || !fObj.isEditing) {
          fObj.set(props);
        } else {
          fObj.set({ fontSize: props.fontSize, fill: props.fill, fontFamily: props.fontFamily });
        }
      }
      // Re-apply positioning with clamping logic
      fObj.setCoords();
      const h = fObj.height * fObj.scaleY;
      const minX = obj.paddingLeft + (fWidth/2);
      const maxX = containerSize.width - obj.paddingRight - (fWidth/2);
      const minY = obj.paddingTop + (h/2);
      const maxY = containerSize.height - obj.paddingBottom - (h/2);
      fObj.set({ left: Math.max(minX, Math.min(maxX, (obj.x/100)*containerSize.width)), top: Math.max(minY, Math.min(maxY, (obj.y/100)*containerSize.height)) });
    });

    resolveStacking(fCanvas);
    fCanvas.requestRenderAll();
    const timer = setTimeout(() => { isRenderingRef.current = false; }, 60);
    return () => clearTimeout(timer);
  }, [page.textObjects, page.masks, containerSize, hideLabels, importMode, resolveStacking]);

  return (<div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[400px]"><canvas ref={canvasRef} /></div>);
};

export default Editor;