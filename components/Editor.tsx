import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject, TextStyle } from '../types';
import { cleanText } from '../utils/helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextId: string | null;
  globalStyle: TextStyle;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onSelectText: (id: string | null) => void;
  onRecordHistory: () => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ 
  page, 
  hideLabels, 
  selectedTextId, 
  globalStyle,
  onUpdateText, 
  onSelectText,
  onRecordHistory
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const callbacks = useRef({ onUpdateText, onSelectText, onRecordHistory });
  useEffect(() => {
    callbacks.current = { onUpdateText, onSelectText, onRecordHistory };
  }, [onUpdateText, onSelectText, onRecordHistory]);

  // Logika Auto-Stacking & Posisi (Alignment Global)
  const applyAutoLayout = useCallback((fCanvas: any) => {
    const textObjects = fCanvas.getObjects().filter((o: any) => o.data?.type === 'text');
    if (textObjects.length === 0) return;

    const padding = globalStyle.padding || 20;
    const gap = 12; // Jarak antar box teks
    
    // 1. Hitung total tinggi seluruh tumpukan teks
    let totalStackHeight = textObjects.reduce((acc: number, obj: any) => 
      acc + (obj.height * obj.scaleY) + gap, 0) - gap;

    // 2. Tentukan posisi Y awal berdasarkan Vertical Alignment
    let currentY = padding;
    if (globalStyle.verticalAlign === 'middle') {
      currentY = (fCanvas.height / 2) - (totalStackHeight / 2);
    } else if (globalStyle.verticalAlign === 'bottom') {
      currentY = fCanvas.height - totalStackHeight - padding;
    }

    // 3. Susun tiap objek teks (Horizontal & Vertikal)
    textObjects.forEach((obj: any) => {
      const objWidth = obj.width * obj.scaleX;
      let currentX = padding;

      // Horizontal Alignment
      if (globalStyle.alignment === 'center') {
        currentX = (fCanvas.width / 2) - (objWidth / 2);
      } else if (globalStyle.alignment === 'right') {
        currentX = fCanvas.width - objWidth - padding;
      }

      obj.set({
        left: currentX,
        top: currentY,
      });
      obj.setCoords();
      
      // Update Y untuk objek berikutnya (Auto-Stacking Atas-Bawah)
      currentY += (obj.height * obj.scaleY) + gap;
    });

    fCanvas.renderAll();
  }, [globalStyle]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#1e293b',
      preserveObjectStacking: true,
      selection: true
    });
    fabricCanvasRef.current = fCanvas;

    fCanvas.on('selection:created', (e: any) => callbacks.current.onSelectText(e.selected[0]?.data?.id));
    fCanvas.on('selection:cleared', () => callbacks.current.onSelectText(null));

    fCanvas.on('object:modified', (e: any) => {
      if (isRenderingRef.current) return;
      callbacks.current.onRecordHistory();
      
      const bgWidth = fCanvas.width || 1;
      const bgHeight = fCanvas.height || 1;

      fCanvas.getObjects().forEach((canvasObj: any) => {
        if (canvasObj.data?.id) {
          callbacks.current.onUpdateText(canvasObj.data.id, { 
            x: (canvasObj.left / bgWidth) * 100, 
            y: (canvasObj.top / bgHeight) * 100,
            width: canvasObj.width * canvasObj.scaleX
          });
        }
      });
    });

    return () => fCanvas.dispose();
  }, []);

  const syncCanvasSize = useCallback(() => {
    if (!containerRef.current || !fabricCanvasRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!fabricCanvasRef.current || !img) return;
      const imgRatio = img.width / img.height;
      const finalWidth = width;
      const finalHeight = width / imgRatio;

      fabricCanvasRef.current.setDimensions({ width: finalWidth, height: finalHeight });
      img.set({ scaleX: finalWidth / img.width, scaleY: finalHeight / img.height, selectable: false, evented: false });
      fabricCanvasRef.current.setBackgroundImage(img, () => {
        fabricCanvasRef.current.set({ width: finalWidth, height: finalHeight });
        setContainerSize({ width: finalWidth, height: finalHeight });
        fabricCanvasRef.current.renderAll();
      });
    });
  }, [page.imageUrl]);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize]);

  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;

    isRenderingRef.current = true;
    const currentObjects = fCanvas.getObjects();
    const activeTextIds = page.textObjects.map(t => t.id);
    const activeBubbleIds = (page.bubbles || []).map(b => b.id);
    const allActiveIds = [...activeTextIds, ...activeBubbleIds];

    // Remove stale objects
    currentObjects.forEach((obj: any) => {
      if (obj.data?.id && !allActiveIds.includes(obj.data.id)) fCanvas.remove(obj);
    });

    // Render/Update Bubbles (Balon Kata)
    (page.bubbles || []).forEach((bubble) => {
      let fabricBubble = fCanvas.getObjects().find((o: any) => o.data?.id === bubble.id);
      const bProps = {
        left: (bubble.x / 100) * containerSize.width,
        top: (bubble.y / 100) * containerSize.height,
        width: bubble.width,
        height: bubble.height,
        fill: bubble.backgroundColor,
        stroke: bubble.borderColor,
        strokeWidth: bubble.borderWidth,
        rx: bubble.style === 'square' ? 5 : 50,
        ry: bubble.style === 'square' ? 5 : 50,
      };

      if (!fabricBubble) {
        fabricBubble = new fabric.Rect({ ...bProps, data: { id: bubble.id, type: 'bubble' } });
        fCanvas.add(fabricBubble);
        fabricBubble.sendToBack();
      } else {
        fabricBubble.set(bProps);
      }
    });

    // Render/Update Text Objects
    page.textObjects.forEach((obj) => {
      let fabricObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      const displayContent = cleanText(obj.originalText, hideLabels);
      
      // Hitung lebar berdasarkan boxType
      const calculatedWidth = obj.boxType === 'caption' 
        ? Math.min(obj.width, containerSize.width - (globalStyle.padding * 2)) 
        : 250;

      const props = {
        width: calculatedWidth,
        fontSize: obj.fontSize,
        fill: obj.color,
        textAlign: obj.alignment,
        stroke: obj.outlineColor,
        strokeWidth: obj.outlineWidth,
        fontFamily: obj.fontFamily,
        text: displayContent,
        paintFirst: 'stroke',
        strokeUniform: true,
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur, opacity: obj.glowOpacity })
      };

      if (!fabricObj) {
        fabricObj = new fabric.Textbox(displayContent, { 
          ...props, 
          data: { id: obj.id, type: 'text' }, 
          lockScalingY: true 
        });
        fCanvas.add(fabricObj);
      } else {
        fabricObj.set(props);
      }
    });

    // Jalankan Auto-Layouting
    applyAutoLayout(fCanvas);
    
    // Manage Selection
    if (selectedTextId) {
      const target = fCanvas.getObjects().find((o: any) => o.data?.id === selectedTextId);
      if (target && fCanvas.getActiveObject() !== target) fCanvas.setActiveObject(target);
    }

    fCanvas.renderAll();
    setTimeout(() => { isRenderingRef.current = false; }, 50);
  }, [page.textObjects, page.bubbles, containerSize, hideLabels, globalStyle, applyAutoLayout, selectedTextId]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 min-h-[500px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;