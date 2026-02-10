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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const callbacks = useRef({ onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize });
  useEffect(() => { 
    callbacks.current = { onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize }; 
  }, [onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize]);

  // --- 1. SETUP PAPAN TULIS (Logika Original Kamu) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { 
      backgroundColor: '#0f172a', 
      preserveObjectStacking: true, 
      selection: true 
    });
    fabricCanvasRef.current = fCanvas;

    fCanvas.on('selection:created', (e: any) => {
      const obj = e.selected ? e.selected[0] : e.target;
      if (obj?.data?.type === 'text') callbacks.current.onSelectText(obj.data.id);
      else if (obj?.data?.type === 'mask') callbacks.current.onSelectMask(obj.data.id);
    });

    fCanvas.on('selection:cleared', () => { 
      callbacks.current.onSelectText(null); 
      callbacks.current.onSelectMask(null); 
    });

    fCanvas.on('object:modified', (e: any) => {
      const obj = e.target;
      if (obj && obj.data?.id) {
        callbacks.current.onRecordHistory();
        const bg = fCanvas.backgroundImage;
        const bW = bg ? bg.width * bg.scaleX : 1; 
        const bH = bg ? bg.height * bg.scaleY : 1;
        if (obj.data.type === 'text') {
          callbacks.current.onUpdateText(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width });
        } else if (obj.data.type === 'mask') {
          callbacks.current.onUpdateMask(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width*obj.scaleX, height: obj.height*obj.scaleY });
        }
      }
    });

    return () => fCanvas.dispose();
  }, [page.id]);

  // --- 2. PASANG GAMBAR BACKGROUND (Logika Original Kamu - Anti Blank) ---
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || !page.imageUrl || !containerRef.current) return;

    const loadImage = () => {
      const { width: contWidth, height: contHeight } = containerRef.current!.getBoundingClientRect();
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
    };

    loadImage();
    const observer = new ResizeObserver(loadImage);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [page.imageUrl]);

  // --- 3. GAMBAR TEKS & MASK (Update Sesuai Request) ---
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;

    const ids = [...page.textObjects.map(t => t.id), ...(page.masks || []).map(m => m.id)];
    fCanvas.getObjects().forEach((o: any) => {
      if (o.data?.id && !ids.includes(o.data.id)) fCanvas.remove(o);
    });

    page.textObjects.forEach((obj) => {
      // PERBAIKAN 1: Logika Hide Name Global (Cari semua Nama : di mana saja)
      let content = obj.originalText;
      if (hideLabels) {
        content = content.replace(/(?:\r?\n|^|,\s*)[^:\n,]+:\s*/g, (match) => {
            return match.startsWith(',') ? ', ' : '';
        });
      }

      const posX = (obj.x / 100) * containerSize.width;
      const posY = (obj.y / 100) * containerSize.height;
      
      // PERBAIKAN 2: Sinkronisasi Lebar & Padding (Biar melipat rapi mengikuti setting)
      const hPadding = (obj.paddingLeft || 0) + (obj.paddingRight || 0);
      // Merubah -80 menjadi -40 agar kotak lebih lebar (sama dengan download)
      const baseW = importMode === 'full' ? containerSize.width - 40 : obj.width;
      const textWidth = Math.max(50, baseW - hPadding);

      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
      const tProps = { 
        width: textWidth,
        fontSize: obj.fontSize, fill: obj.color, textAlign: 'center', 
        originX: 'center', originY: 'center', fontFamily: obj.fontFamily, text: content, 
        stroke: obj.outlineColor, strokeWidth: obj.outlineWidth,
        paintFirst: 'stroke', strokeLineJoin: 'round',
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur, opacity: obj.glowOpacity }) 
      };

      if (!fObj) fCanvas.add(new fabric.Textbox(content, { ...tProps, left: posX, top: posY, data: { id: obj.id, type: 'text' } }));
      else if (!fObj.isEditing) fObj.set({ ...tProps, left: posX, top: posY });

      // PERBAIKAN 3: Clamp posisi (Agar teks tidak keluar batas bawah)
      const currentObj = fObj || fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      if (currentObj) {
        const halfH = (currentObj.height * currentObj.scaleY) / 2;
        const maxTop = containerSize.height - (obj.paddingBottom || 0) - halfH;
        if (currentObj.top > maxTop) currentObj.set({ top: maxTop }).setCoords();
      }
    });

    (page.masks || []).forEach((mask) => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === mask.id && o.data?.type === 'mask');
      const mProps = { left: (mask.x/100)*containerSize.width, top: (mask.y/100)*containerSize.height, width: mask.width, height: mask.height, fill: mask.fill, originX: 'center', originY: 'center' };
      if (!fObj) fCanvas.add(new fabric.Rect({ ...mProps, data: { id: mask.id, type: 'mask' } }));
      else fObj.set(mProps);
    });

    fCanvas.getObjects().forEach((obj: any) => { 
      if (obj.data?.type === 'mask') fCanvas.sendToBack(obj);
      if (obj.data?.type === 'text') fCanvas.bringToFront(obj); 
    });

    fCanvas.requestRenderAll();
  }, [page.textObjects, page.masks, containerSize, hideLabels, importMode]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;