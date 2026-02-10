import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject, ImportMode } from '../types';
import { cleanText } from '../utils/helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextId: string | null;
  importMode: ImportMode;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onSelectText: (id: string | null) => void;
  onRecordHistory: () => void;
  onResize: (width: number) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ page, hideLabels, selectedTextId, importMode, onUpdateText, onSelectText, onRecordHistory, onResize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const callbacks = useRef({ onUpdateText, onSelectText, onRecordHistory, onResize });
  useEffect(() => { callbacks.current = { onUpdateText, onSelectText, onRecordHistory, onResize }; }, [onUpdateText, onSelectText, onRecordHistory, onResize]);

  // Fix Stacking Logic
  const resolveStacking = useCallback((fCanvas: any) => {
    const textboxes = fCanvas.getObjects().filter((o: any) => o.data?.id);
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
        const overlapX = (currentRect.left < aboveRect.left + aboveRect.width) && 
                         (currentRect.left + currentRect.width > aboveRect.left);
        
        if (overlapX && currentRect.top < aboveRect.top + aboveRect.height + PADDING) {
          current.set({ top: aboveRect.top + aboveRect.height + PADDING });
          current.setCoords();
          changed = true;
        }
      }
    }
    if (changed) fCanvas.renderAll();
  }, []);

  // Initial Setup
  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { backgroundColor: '#1e293b', preserveObjectStacking: true, selection: true });
    fabricCanvasRef.current = fCanvas;

    const handleSelection = (e: any) => {
      if (isRenderingRef.current) return;
      const activeObj = e.selected ? e.selected[0] : e.target;
      if (activeObj && activeObj.data?.id) callbacks.current.onSelectText(activeObj.data.id);
    };

    fCanvas.on('selection:created', handleSelection);
    fCanvas.on('selection:updated', handleSelection);
    fCanvas.on('selection:cleared', () => { if (!isRenderingRef.current) callbacks.current.onSelectText(null); });

    const handleModified = (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
        callbacks.current.onRecordHistory();
        
        const bg = fCanvas.backgroundImage;
        const bgWidth = bg ? bg.width * bg.scaleX : 1;
        const bgHeight = bg ? bg.height * bg.scaleY : 1;

        fCanvas.getObjects().forEach((canvasObj: any) => {
          if (canvasObj.data?.id) {
            const relX = (canvasObj.left / bgWidth) * 100;
            const relY = (canvasObj.top / bgHeight) * 100;
            const newWidth = canvasObj.width * canvasObj.scaleX;
            canvasObj.set({ width: newWidth, scaleX: 1, scaleY: 1 });
            callbacks.current.onUpdateText(canvasObj.data.id, { x: relX, y: relY, width: newWidth });
          }
        });
        resolveStacking(fCanvas);
      }
    };
    
    fCanvas.on('object:modified', handleModified);
    fCanvas.on('text:changed', (e: any) => {
      if (isRenderingRef.current) return;
      if (e.target?.data?.id) {
        callbacks.current.onUpdateText(e.target.data.id, { originalText: e.target.text });
        resolveStacking(fCanvas);
      }
    });
    
    return () => { if (fabricCanvasRef.current) { fabricCanvasRef.current.dispose(); fabricCanvasRef.current = null; } };
  }, [resolveStacking]);

  // Fix Preview Image: Ensure image is loaded properly
  const syncCanvasSize = useCallback(() => {
    if (!containerRef.current || !fabricCanvasRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const fCanvas = fabricCanvasRef.current;
    
    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!fabricCanvasRef.current || !img) return;
      
      const imgRatio = img.width / img.height;
      const containerRatio = width / height;
      
      let finalWidth, finalHeight;
      if (imgRatio > containerRatio) { 
        finalWidth = width; 
        finalHeight = width / imgRatio; 
      } else { 
        finalHeight = height; 
        finalWidth = height * imgRatio; 
      }
      
      fCanvas.setDimensions({ width: finalWidth, height: finalHeight });
      img.set({ 
        scaleX: finalWidth / img.width, 
        scaleY: finalHeight / img.height, 
        left: 0, 
        top: 0, 
        selectable: false, 
        evented: false 
      });
      
      fCanvas.setBackgroundImage(img, () => { 
        fCanvas.renderAll(); 
        setContainerSize({ width: finalWidth, height: finalHeight });
        callbacks.current.onResize(finalWidth);
      });
    }, { crossOrigin: 'anonymous' });
  }, [page.imageUrl]);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize]);

  // Main Render Loop with Boundary Clamping Fix
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    isRenderingRef.current = true;

    page.textObjects.forEach((obj) => {
      const displayContent = cleanText(obj.originalText, hideLabels);
      let fabricObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      
      // Fix Poin 5: Full Width Logic
      const finalWidth = importMode === 'full' 
        ? containerSize.width - (obj.paddingLeft + obj.paddingRight + 40)
        : obj.width;

      // Fix Poin 2: Boundary Clamping (Agar tidak nabrak padding)
      const minX = obj.paddingLeft + (finalWidth / 2);
      const maxX = containerSize.width - obj.paddingRight - (finalWidth / 2);
      // Gunakan fontSize sebagai estimasi awal tinggi
      const minY = obj.paddingTop + (obj.fontSize / 2); 
      const maxY = containerSize.height - obj.paddingBottom - (obj.fontSize / 2);

      const rawPosX = (obj.x / 100) * containerSize.width;
      const rawPosY = (obj.y / 100) * containerSize.height;

      const posX = Math.max(minX, Math.min(maxX, rawPosX));
      const posY = Math.max(minY, Math.min(maxY, rawPosY));

      const props = {
        left: posX,
        top: posY,
        width: finalWidth,
        fontSize: obj.fontSize,
        padding: 0, 
        fill: obj.color,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        stroke: obj.outlineColor,
        strokeWidth: obj.outlineWidth || 0,
        strokeUniform: true,
        paintFirst: 'stroke',
        fontFamily: obj.fontFamily || 'Inter',
        text: displayContent,
        editable: true,
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur || 0, offsetX: 0, offsetY: 0, opacity: obj.glowOpacity, nonScaling: true })
      };

      if (!fabricObj) {
        fabricObj = new fabric.Textbox(displayContent, { ...props, data: { id: obj.id }, lockScalingY: true });
        fCanvas.add(fabricObj);
      } else {
        if (fabricObj !== fCanvas.getActiveObject() || !fabricObj.isEditing) fabricObj.set(props);
      }
      
      // Re-Clamp after render (karena tinggi text baru ketahuan setelah render)
      fabricObj.setCoords();
      const actualHeight = fabricObj.height * fabricObj.scaleY;
      const strictMinY = obj.paddingTop + (actualHeight / 2);
      const strictMaxY = containerSize.height - obj.paddingBottom - (actualHeight / 2);
      
      // Jika menabrak, dorong masuk
      if (fabricObj.top < strictMinY || fabricObj.top > strictMaxY) {
         fabricObj.set({ top: Math.max(strictMinY, Math.min(strictMaxY, fabricObj.top)) });
      }
    });

    const target = fCanvas.getObjects().find((o: any) => o.data?.id === selectedTextId);
    if (target && fCanvas.getActiveObject() !== target) fCanvas.setActiveObject(target);
    else if (!selectedTextId) fCanvas.discardActiveObject();

    resolveStacking(fCanvas);
    fCanvas.renderAll();
    setTimeout(() => { isRenderingRef.current = false; }, 50);
  }, [page.textObjects, containerSize, hideLabels, selectedTextId, importMode, resolveStacking]);

  return (<div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[400px]"><canvas ref={canvasRef} /></div>);
};

export default Editor;