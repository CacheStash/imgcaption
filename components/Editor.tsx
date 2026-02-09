import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Page, TextObject, TextStyle, Alignment, VerticalAlignment } from '../types';
import { cleanText, FONT_OPTIONS } from '../utils/helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextId: string | null;
  globalStyle: TextStyle;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onSelectText: (id: string | null) => void;
  onUpdateOverride: (style: TextStyle) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ page, hideLabels, selectedTextId, globalStyle, onUpdateText, onSelectText, onUpdateOverride }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const activeStyle = page.overrideStyle || globalStyle;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width > 0) setContainerWidth(width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const applyAutoLayout = useCallback((fCanvas: any) => {
    const texts = fCanvas.getObjects().filter((o: any) => o.data?.type === 'text' && !o.data?.isManuallyPlaced);
    if (texts.length === 0) return;

    const padding = activeStyle.padding || 20;
    const gap = 15;
    let totalHeight = texts.reduce((acc: number, o: any) => acc + o.getScaledHeight() + gap, 0) - gap;
    let currentY = padding;

    if (activeStyle.verticalAlign === 'middle') currentY = (fCanvas.height / 2) - (totalHeight / 2);
    else if (activeStyle.verticalAlign === 'bottom') currentY = fCanvas.height - totalHeight - padding;

    texts.forEach((obj: any) => {
      let currentX = padding;
      if (activeStyle.alignment === 'center') currentX = (fCanvas.width / 2) - (obj.getScaledWidth() / 2);
      else if (activeStyle.alignment === 'right') currentX = fCanvas.width - obj.getScaledWidth() - padding;
      obj.set({ left: currentX, top: currentY });
      obj.setCoords();
      currentY += obj.getScaledHeight() + gap;
    });
    fCanvas.renderAll();
  }, [activeStyle]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { backgroundColor: '#0f172a', preserveObjectStacking: true });
    fabricCanvasRef.current = fCanvas;

    fCanvas.on('selection:created', (e: any) => onSelectText(e.selected[0]?.data?.id));
    fCanvas.on('selection:cleared', () => onSelectText(null));

    fCanvas.on('object:modified', (e: any) => {
      const obj = e.target;
      if (obj.data?.type === 'text') {
        // Simpan koordinat relatif (%) agar sinkron saat export resolusi tinggi
        onUpdateText(obj.data.id, { 
          x: obj.left / fCanvas.width, 
          y: obj.top / fCanvas.height, 
          isManuallyPlaced: true 
        });
      }
    });

    return () => fCanvas.dispose();
  }, [onSelectText, onUpdateText]);

  useEffect(() => {
    if (!fabricCanvasRef.current || containerWidth === 0) return;
    const fCanvas = fabricCanvasRef.current;
    
    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!img) return;
      const scale = containerWidth / img.width;
      fCanvas.setDimensions({ width: img.width * scale, height: img.height * scale });
      img.set({ scaleX: scale, scaleY: scale, selectable: false, evented: false });
      
      fCanvas.setBackgroundImage(img, () => {
        const texts = fCanvas.getObjects().filter((o: any) => o.data?.type === 'text');
        texts.forEach((o: any) => fCanvas.remove(o));
        
        page.textObjects.forEach((obj) => {
          const boxWidth = activeStyle.boxType === 'caption' ? fCanvas.width - (activeStyle.padding * 2) : 280;
          const tBox = new fabric.Textbox(cleanText(obj.originalText, hideLabels), {
            left: obj.isManuallyPlaced ? obj.x * fCanvas.width : 0,
            top: obj.isManuallyPlaced ? obj.y * fCanvas.height : 0,
            width: boxWidth, fontSize: activeStyle.fontSize, fill: activeStyle.color,
            textAlign: activeStyle.alignment, fontFamily: activeStyle.fontFamily,
            stroke: activeStyle.outlineColor, strokeWidth: activeStyle.outlineWidth,
            strokeUniform: true, paintFirst: 'stroke',
            backgroundColor: activeStyle.textBackgroundColor !== 'transparent' ? activeStyle.textBackgroundColor : null,
            data: { id: obj.id, type: 'text', isManuallyPlaced: obj.isManuallyPlaced }, 
            shadow: new fabric.Shadow({ color: activeStyle.glowColor, blur: activeStyle.glowBlur })
          });
          fCanvas.add(tBox);
        });
        applyAutoLayout(fCanvas);
      });
    }, { crossOrigin: 'anonymous' });
    // Hapus selectedTextId dari dependency agar klik tidak memicu re-render image
  }, [page.imageUrl, page.textObjects, activeStyle, hideLabels, applyAutoLayout, containerWidth]);

  return (
    <div ref={containerRef} className="w-full max-w-4xl flex justify-center shadow-2xl bg-slate-800 rounded-sm overflow-hidden relative min-h-[500px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;