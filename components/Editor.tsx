import React, { useEffect, useRef, useCallback } from 'react';
import { Page, TextObject, TextStyle, Alignment, VerticalAlignment } from '../types';
import { cleanText } from '../utils/helpers';

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
      const maxWidth = containerRef.current?.clientWidth || 800;
      const scale = maxWidth / img.width;
      fCanvas.setDimensions({ width: img.width * scale, height: img.height * scale });
      img.set({ scaleX: scale, scaleY: scale, selectable: false, evented: false });
      fCanvas.setBackgroundImage(img, () => {
        fCanvas.getObjects().forEach((o: any) => fCanvas.remove(o));
        page.textObjects.forEach((obj) => {
          const tBox = new fabric.Textbox(cleanText(obj.originalText, hideLabels), {
            width: obj.boxType === 'caption' ? fCanvas.width - (activeStyle.padding * 2) : 280,
            fontSize: obj.fontSize, fill: obj.color, textAlign: obj.alignment, fontFamily: obj.fontFamily,
            stroke: obj.outlineColor, strokeWidth: obj.outlineWidth, strokeUniform: true, paintFirst: 'stroke',
            data: { id: obj.id, type: 'text' }, shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur })
          });
          fCanvas.add(tBox);
        });
        applyAutoLayout(fCanvas);
      });
    });
  }, [page.imageUrl, page.textObjects, activeStyle, hideLabels, applyAutoLayout]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* LOCAL TOOLBAR */}
      <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
        <select value={activeStyle.alignment} onChange={(e) => onUpdateOverride({...activeStyle, alignment: e.target.value as Alignment})} className="bg-transparent text-[10px] px-2 outline-none">
          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
        </select>
        <div className="w-px h-4 bg-slate-700"></div>
        <select value={activeStyle.verticalAlign} onChange={(e) => onUpdateOverride({...activeStyle, verticalAlign: e.target.value as VerticalAlignment})} className="bg-transparent text-[10px] px-2 outline-none">
          <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
        </select>
      </div>
      <div ref={containerRef} className="w-full flex justify-center shadow-2xl bg-slate-800 rounded-sm overflow-hidden">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default Editor;