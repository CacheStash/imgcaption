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
  const [isMaskMode, setIsMaskMode] = useState(false);
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
      let currentX = padding;
      if (activeStyle.alignment === 'center') currentX = (fCanvas.width / 2) - (obj.getScaledWidth() / 2);
      else if (activeStyle.alignment === 'right') currentX = fCanvas.width - obj.getScaledWidth() - padding;
      obj.set({ left: currentX, top: currentY });
      obj.setCoords();
      currentY += (obj.getScaledHeight()) + gap;
    });
    fCanvas.renderAll();
  }, [activeStyle]);

  // SMART RE-FILL LOGIC
  const addSmartMask = useCallback((event: any) => {
    if (!isMaskMode || !fabricCanvasRef.current) return;
    const fCanvas = fabricCanvasRef.current;
    const pointer = fCanvas.getPointer(event.e);
    const ctx = fCanvas.getContext();
    const pixel = ctx.getImageData(event.e.offsetX, event.e.offsetY, 1, 1).data;
    const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

    const mask = new fabric.Rect({
      left: pointer.x - 50, top: pointer.y - 30,
      width: 100, height: 60, fill: color, rx: 15, ry: 15,
      data: { type: 'mask' }
    });
    fCanvas.add(mask);
    setIsMaskMode(false);
  }, [isMaskMode]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { backgroundColor: '#0f172a', preserveObjectStacking: true });
    fabricCanvasRef.current = fCanvas;
    fCanvas.on('selection:created', (e: any) => onSelectText(e.selected[0]?.data?.id));
    fCanvas.on('selection:cleared', () => onSelectText(null));
    fCanvas.on('mouse:down', (e: any) => { if(isMaskMode) addSmartMask(e); });
    return () => fCanvas.dispose();
  }, [isMaskMode, addSmartMask]);

  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const fCanvas = fabricCanvasRef.current;
    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      const maxWidth = containerRef.current?.clientWidth || 800;
      const scale = maxWidth / img.width;
      fCanvas.setDimensions({ width: img.width * scale, height: img.height * scale });
      img.set({ scaleX: scale, scaleY: scale, selectable: false, evented: false });
      fCanvas.setBackgroundImage(img, () => {
        const texts = fCanvas.getObjects().filter((o: any) => o.data?.type === 'text');
        texts.forEach((o: any) => fCanvas.remove(o));
        page.textObjects.forEach((obj) => {
          const tBox = new fabric.Textbox(cleanText(obj.originalText, hideLabels), {
            width: obj.boxType === 'caption' ? fCanvas.width - (activeStyle.padding * 2) : 280,
            fontSize: obj.fontSize, fill: obj.color, textAlign: obj.alignment, fontFamily: obj.fontFamily,
            stroke: obj.outlineColor, strokeWidth: obj.outlineWidth, strokeUniform: true, paintFirst: 'stroke',
            backgroundColor: obj.textBackgroundColor !== 'transparent' ? obj.textBackgroundColor : null, // FITUR PENIMPA
            data: { id: obj.id, type: 'text' }, shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur })
          });
          fCanvas.add(tBox);
        });
        applyAutoLayout(fCanvas);
      });
    }, { crossOrigin: 'anonymous' });
  }, [page.imageUrl, page.textObjects, activeStyle, hideLabels, applyAutoLayout]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="flex gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-lg">
        <button onClick={() => setIsMaskMode(!isMaskMode)} className={`px-4 h-8 rounded text-xs font-bold ${isMaskMode ? 'bg-blue-500' : 'bg-slate-900 text-blue-400 border border-blue-900/50'}`}>+ SMART MASK</button>
        <div className="w-px h-6 bg-slate-700 mx-2"></div>
        <select value={activeStyle.fontFamily} onChange={(e) => onUpdateOverride({...activeStyle, fontFamily: e.target.value})} className="bg-slate-900 text-[10px] px-2 h-8 rounded border border-slate-700 outline-none">
          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
        </select>
      </div>
      <div ref={containerRef} className="w-full flex justify-center shadow-2xl bg-slate-800 rounded-sm overflow-hidden relative">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default Editor;