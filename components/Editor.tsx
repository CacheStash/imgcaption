import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject, TextStyle } from '../types';
import { cleanText } from '../helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextId: string | null;
  globalStyle: TextStyle;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onSelectText: (id: string | null) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ page, hideLabels, selectedTextId, globalStyle, onUpdateText, onSelectText }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRenderingRef = useRef(false);
  const activeStyle = page.overrideStyle || globalStyle;

  const applyAutoLayout = useCallback((fCanvas: any) => {
    const texts = fCanvas.getObjects().filter((o: any) => o.data?.type === 'text');
    if (texts.length === 0) return;

    const padding = activeStyle.padding;
    const gap = 15;
    let totalHeight = texts.reduce((acc: number, o: any) => acc + (o.height * o.scaleY) + gap, 0) - gap;

    let currentY = padding;
    if (activeStyle.verticalAlign === 'middle') currentY = (fCanvas.height / 2) - (totalHeight / 2);
    else if (activeStyle.verticalAlign === 'bottom') currentY = fCanvas.height - totalHeight - padding;

    texts.forEach((obj: any) => {
      const w = obj.width * obj.scaleX;
      let currentX = padding;
      if (activeStyle.alignment === 'center') currentX = (fCanvas.width / 2) - (w / 2);
      else if (activeStyle.alignment === 'right') currentX = fCanvas.width - w - padding;

      obj.set({ left: currentX, top: currentY });
      obj.setCoords();
      currentY += (obj.height * obj.scaleY) + gap;
    });
    fCanvas.renderAll();
  }, [activeStyle]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { backgroundColor: '#0f172a', preserveObjectStacking: true });
    fabricCanvasRef.current = fCanvas;
    fCanvas.on('selection:created', (e: any) => onSelectText(e.selected[0]?.data?.id));
    fCanvas.on('selection:cleared', () => onSelectText(null));
    return () => fCanvas.dispose();
  }, []);

  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const fCanvas = fabricCanvasRef.current;
    
    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      // FIX: Ukuran kanvas mengikuti aspek rasio gambar asli
      const maxWidth = containerRef.current?.clientWidth || 800;
      const scale = maxWidth / img.width;
      const finalWidth = img.width * scale;
      const finalHeight = img.height * scale;

      fCanvas.setDimensions({ width: finalWidth, height: finalHeight });
      img.set({ scaleX: scale, scaleY: scale, selectable: false, evented: false });
      fCanvas.setBackgroundImage(img, () => {
        fCanvas.renderAll();
        
        // Render Objects
        isRenderingRef.current = true;
        fCanvas.getObjects().forEach((o: any) => fCanvas.remove(o));

        page.textObjects.forEach((obj) => {
          const content = cleanText(obj.originalText, hideLabels);
          const tBox = new fabric.Textbox(content, {
            width: obj.boxType === 'caption' ? finalWidth - (activeStyle.padding * 2) : 280,
            fontSize: obj.fontSize,
            fill: obj.color,
            textAlign: obj.alignment,
            fontFamily: obj.fontFamily,
            stroke: obj.outlineColor,
            strokeWidth: obj.outlineWidth,
            strokeUniform: true,
            paintFirst: 'stroke',
            data: { id: obj.id, type: 'text' },
            shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur })
          });
          fCanvas.add(tBox);
        });

        applyAutoLayout(fCanvas);
        isRenderingRef.current = false;
      });
    });
  }, [page.imageUrl, page.textObjects, activeStyle, hideLabels, applyAutoLayout]);

  return (
    <div ref={containerRef} className="w-full flex justify-center p-4">
      <div className="shadow-2xl border border-slate-700 rounded-sm overflow-hidden bg-slate-800">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default Editor;