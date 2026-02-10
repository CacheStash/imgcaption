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

  // Jaga Teks agar tidak keluar batas (Bawah/Atas/Samping)
  const clampPosition = useCallback((obj: any, data: TextObject) => {
    if (!containerSize.width || !containerSize.height) return;
    const width = obj.width * obj.scaleX;
    const height = obj.height * obj.scaleY;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const minLeft = (data.paddingLeft || 0) + halfWidth;
    const maxLeft = containerSize.width - (data.paddingRight || 0) - halfWidth;
    const minTop = (data.paddingTop || 0) + halfHeight;
    const maxTop = containerSize.height - (data.paddingBottom || 0) - halfHeight;

    let newLeft = obj.left;
    let newTop = obj.top;

    if (maxLeft > minLeft) newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    else newLeft = (minLeft + maxLeft) / 2;

    if (maxTop > minTop) newTop = Math.max(minTop, Math.min(newTop, maxTop));
    else newTop = (minTop + maxTop) / 2;

    if (newLeft !== obj.left || newTop !== obj.top) {
      obj.set({ left: newLeft, top: newTop });
      obj.setCoords();
    }
  }, [containerSize]);

  // Atur Tumpukan: Mask (Belakang) -> Text (Depan)
  const resolveStacking = useCallback((fCanvas: any) => {
    const objs = fCanvas.getObjects();
    objs.forEach((obj: any) => { 
      if (obj.data?.type === 'mask') fCanvas.sendToBack(obj);
      if (obj.data?.type === 'shape') fCanvas.moveTo(obj, objs.length > 2 ? 1 : 0);
      if (obj.data?.type === 'text') fCanvas.bringToFront(obj); 
    });
    fCanvas.requestRenderAll();
  }, []);

  // Setup Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { 
      backgroundColor: '#0f172a', 
      preserveObjectStacking: true, 
      selection: true 
    });
    fabricCanvasRef.current = fCanvas;

    fCanvas.on('selection:created', (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.selected ? e.selected[0] : e.target;
      if (obj?.data?.type === 'text') { callbacks.current.onSelectText(obj.data.id); callbacks.current.onSelectMask(null); }
      else if (obj?.data?.type === 'mask') { callbacks.current.onSelectMask(obj.data.id); callbacks.current.onSelectText(null); }
    });

    fCanvas.on('selection:cleared', () => { if (!isRenderingRef.current) { callbacks.current.onSelectText(null); callbacks.current.onSelectMask(null); } });

    fCanvas.on('object:modified', (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
        callbacks.current.onRecordHistory();
        const bg = fCanvas.backgroundImage;
        const bW = bg ? bg.width * bg.scaleX : 1; 
        const bH = bg ? bg.height * bg.scaleY : 1;
        
        if (obj.data.type === 'text') {
          const textData = page.textObjects.find(t => t.id === obj.data.id);
          if (textData) clampPosition(obj, textData);
          callbacks.current.onUpdateText(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width });
        } else if (obj.data.type === 'mask') {
          callbacks.current.onUpdateMask(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width*obj.scaleX, height: obj.height*obj.scaleY });
        }
        resolveStacking(fCanvas);
      }
    });

    return () => { fCanvas.dispose(); fabricCanvasRef.current = null; };
  }, [page.id, resolveStacking, clampPosition]);

  // Sync Ukuran & Gambar Background (IKUTI BACKUP YANG BERHASIL)
  const syncCanvasSize = useCallback(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!containerRef.current || !fCanvas) return;
    
    const { width: contWidth, height: contHeight } = containerRef.current.getBoundingClientRect();
    if (contWidth === 0) return;

    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!img) return;
      const imgRatio = img.width / img.height; 
      let finalWidth = contWidth, finalHeight = contWidth / imgRatio;
      if (finalHeight > contHeight) { finalHeight = contHeight; finalWidth = contHeight * imgRatio; }
      
      fCanvas.setDimensions({ width: finalWidth, height: finalHeight });
      img.set({ scaleX: finalWidth/img.width, scaleY: finalHeight/img.height, left: 0, top: 0, selectable: false, evented: false });
      fCanvas.setBackgroundImage(img, () => {
        setContainerSize({ width: finalWidth, height: finalHeight });
        callbacks.current.onResize(finalWidth);
        fCanvas.renderAll(); // FORCE RENDER AGAR TIDAK BLANK
      });
    }, { crossOrigin: 'anonymous' }); 
  }, [page.imageUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => syncCanvasSize());
    observer.observe(containerRef.current);
    syncCanvasSize();
    return () => observer.disconnect();
  }, [syncCanvasSize]);

  // Render Objek (Teks, Mask, dsb)
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    isRenderingRef.current = true;
    
    const textIds = page.textObjects.map(t => t.id);
    const maskIds = (page.masks || []).map(m => m.id);
    fCanvas.getObjects().forEach((obj: any) => {
      if (obj.data?.id && ((obj.data.type === 'text' && !textIds.includes(obj.data.id)) || (obj.data.type === 'mask' && !maskIds.includes(obj.data.id)) || (obj.data.type === 'shape' && !textIds.includes(obj.data.id)))) {
        fCanvas.remove(obj);
      }
    });

    // Render Masks
    (page.masks || []).forEach((mask) => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === mask.id && o.data?.type === 'mask');
      const props = { left: (mask.x/100)*containerSize.width, top: (mask.y/100)*containerSize.height, width: mask.width, height: mask.height, fill: mask.fill, originX: 'center', originY: 'center' };
      if (!fObj) { fCanvas.add(new fabric.Rect({ ...props, data: { id: mask.id, type: 'mask' } })); } 
      else if (fObj !== fCanvas.getActiveObject()) { fObj.set(props); }
    });

    // Render Texts
    page.textObjects.forEach((obj) => {
      // FIX LOGIKA HIDE NAME GLOBAL
      let content = obj.originalText;
      if (hideLabels) {
        content = content.replace(/(?:\r?\n|^|,\s*)[^:\n,]+:\s*/g, (match) => match.startsWith(',') ? ', ' : '');
      }

      const posX = (obj.x / 100) * containerSize.width;
      const posY = (obj.y / 100) * containerSize.height;
      
      // FIX WRAPPING & PADDING (Sesuai Logika Download)
      const hPadding = (obj.paddingLeft || 0) + (obj.paddingRight || 0);
      const fWidth = importMode === 'full' ? containerSize.width - 40 : obj.width;
      const textWidth = Math.max(50, fWidth - hPadding);

      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
      const tProps = { 
        width: textWidth, fontSize: obj.fontSize, fill: obj.color, textAlign: 'center', 
        originX: 'center', originY: 'center', fontFamily: obj.fontFamily, text: content, 
        stroke: obj.outlineColor, strokeWidth: obj.outlineWidth,
        paintFirst: 'stroke', strokeLineJoin: 'round', // OUTLINE TETAP DI LUAR
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur, opacity: obj.glowOpacity }) 
      };
      
      if (!fObj) { 
        const newTxt = new fabric.Textbox(content, { ...tProps, left: posX, top: posY, data: { id: obj.id, type: 'text' }, lockScalingY: true });
        fCanvas.add(newTxt); 
        clampPosition(newTxt, obj);
      }
      else if (fObj !== fCanvas.getActiveObject() || !fObj.isEditing) { 
        fObj.set({ ...tProps, left: posX, top: posY }); 
        clampPosition(fObj, obj); 
      }
    });

    resolveStacking(fCanvas);
    const timer = setTimeout(() => { isRenderingRef.current = false; fCanvas.requestRenderAll(); }, 50);
    return () => clearTimeout(timer);
  }, [page.textObjects, page.masks, containerSize, hideLabels, importMode, resolveStacking, clampPosition]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;