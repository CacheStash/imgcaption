import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject, ImportMode, MaskObject } from '../types';
import { cleanText } from '../utils/helpers';

// DEFINISI INTERFACE (Memperbaiki error 'Cannot find name EditorProps')
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
  useEffect(() => { 
    callbacks.current = { onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize }; 
  }, [onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize]);

  // 1. Logic Resolve Stacking (Memperbaiki error 'Cannot find name resolveStacking')
  const resolveStacking = useCallback((fCanvas: any) => {
    if (!fCanvas) return;
    const objs = fCanvas.getObjects();
    objs.forEach((obj: any) => { 
      if (obj.data?.type === 'mask') fCanvas.sendToBack(obj);
      if (obj.data?.type === 'shape') fCanvas.moveTo(obj, objs.length > 2 ? 1 : 0);
      if (obj.data?.type === 'text') fCanvas.bringToFront(obj); 
    });
    fCanvas.requestRenderAll();
  }, []);

  // 2. Logic Clamp Position (Agar teks tidak bablas keluar padding)
  const clampPosition = useCallback((obj: any, data: TextObject) => {
    if (!containerSize.width || !containerSize.height) return;
    
    const halfWidth = (obj.width * obj.scaleX) / 2;
    const halfHeight = (obj.height * obj.scaleY) / 2;

    const minLeft = data.paddingLeft + halfWidth;
    const maxLeft = containerSize.width - data.paddingRight - halfWidth;
    const minTop = data.paddingTop + halfHeight;
    const maxTop = containerSize.height - data.paddingBottom - halfHeight;

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

  // 3. Inisialisasi Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { 
      backgroundColor: '#0f172a', 
      preserveObjectStacking: true, 
      selection: true 
    });
    fabricCanvasRef.current = fCanvas;

    // Event handlers (selection, modified, etc)
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
          callbacks.current.onUpdateText(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width*obj.scaleX });
        }
        resolveStacking(fCanvas);
      }
    });

    return () => { fCanvas.dispose(); fabricCanvasRef.current = null; };
  }, [page.id, resolveStacking, clampPosition]);

  // 4. Anti-Flicker Image Loading
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
        fCanvas.renderAll(); 
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

  // 5. Main Render Loop (Wrapping & Padding Fix)
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    isRenderingRef.current = true;
    
    // Cleanup removed objects logic... (tetap sama)
    const textIds = page.textObjects.map(t => t.id);
    fCanvas.getObjects().forEach((obj: any) => {
      if (obj.data?.id && obj.data.type === 'text' && !textIds.includes(obj.data.id)) {
        fCanvas.remove(obj);
      }
    });

    page.textObjects.forEach((obj) => {
      const content = cleanText(obj.originalText, hideLabels);
      
      // FIX: Hitung Max Width dikurangi padding kiri & kanan
      const maxAllowedWidth = containerSize.width - (obj.paddingLeft + obj.paddingRight);
      const fWidth = importMode === 'full' ? maxAllowedWidth : Math.min(obj.width || 200, maxAllowedWidth);
      
      const posX = (obj.x / 100) * containerSize.width;
      const posY = (obj.y / 100) * containerSize.height;

      // Render Shape (Background Box)
      if (obj.boxShape && obj.boxShape !== 'none') {
        let shapeObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'shape');
        let textObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
        
        const currentH = textObj ? textObj.height * textObj.scaleY : obj.fontSize * 1.5;
        const currentW = textObj ? textObj.width * textObj.scaleX : fWidth;
        
        const sW = currentW + (obj.paddingLeft + obj.paddingRight);
        const sH = currentH + (obj.paddingTop + obj.paddingBottom);
        const sProps = { left: posX, top: posY, width: sW, height: sH, fill: obj.backgroundColor || '#ffffff', originX: 'center', originY: 'center', selectable: false, evented: false };

        if (!shapeObj) {
          const newShape = obj.boxShape === 'oval' ? new fabric.Ellipse({ ...sProps, rx: sW/2, ry: sH/2 }) : new fabric.Rect({ ...sProps, rx: obj.boxShape === 'rounded' ? 20 : 0, ry: obj.boxShape === 'rounded' ? 20 : 0 });
          newShape.set('data', { id: obj.id, type: 'shape' });
          fCanvas.add(newShape);
        } else {
          shapeObj.set(obj.boxShape === 'oval' ? { ...sProps, rx: sW/2, ry: sH/2 } : { ...sProps, rx: obj.boxShape === 'rounded' ? 20 : 0, ry: obj.boxShape === 'rounded' ? 20 : 0 });
        }
      }

      // Render Text dengan Wrapping Otomatis
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
      const tProps = { 
        width: fWidth, // Ini mengunci text agar tidak keluar padding
        fontSize: obj.fontSize, 
        fill: obj.color, 
        textAlign: 'center', 
        originX: 'center', 
        originY: 'center', 
        fontFamily: obj.fontFamily, 
        text: content, 
        stroke: obj.outlineColor, 
        strokeWidth: obj.outlineWidth,
        paintFirst: 'stroke',
        splitByGrapheme: true // Menjaga wrapping tetap rapi
      };
      
      if (!fObj) { 
        fCanvas.add(new fabric.Textbox(content, { ...tProps, left: posX, top: posY, data: { id: obj.id, type: 'text' }, lockScalingY: true })); 
      } else if (fObj !== fCanvas.getActiveObject() || !fObj.isEditing) { 
        fObj.set({ ...tProps, left: posX, top: posY }); 
        clampPosition(fObj, obj); 
      }
    });

    resolveStacking(fCanvas);
    const timer = setTimeout(() => { isRenderingRef.current = false; fCanvas.requestRenderAll(); }, 100);
    return () => clearTimeout(timer);
  }, [page.textObjects, containerSize, hideLabels, importMode, resolveStacking, clampPosition]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;