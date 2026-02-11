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
 isSmartFill?: boolean;
  onAddSmartMask?: (mask: MaskObject) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ 
  page, hideLabels, selectedTextId, selectedMaskId, importMode, 
  onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize,
  isSmartFill, onAddSmartMask
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update callbacks ref dengan props baru
  const callbacks = useRef({ onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize, onAddSmartMask, isSmartFill });
  useEffect(() => { 
    callbacks.current = { onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize, onAddSmartMask, isSmartFill }; 
  }, [onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize, onAddSmartMask, isSmartFill]);

  // --- ALGORITMA FLOOD FILL DENGAN DILATION (Penutup Celah) ---
  const performSmartFill = (startX: number, startY: number) => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || !callbacks.current.onAddSmartMask) return;

    const bgImage = fCanvas.backgroundImage;
    if (!bgImage) { alert("No image!"); return; }

    const rawCanvas = fCanvas.getElement();
    const ctx = rawCanvas.getContext('2d');
    const { width, height } = rawCanvas;
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const getIdx = (x: number, y: number) => (y * width + x) * 4;
    
    const startIndex = getIdx(Math.floor(startX), Math.floor(startY));
    const startR = data[startIndex], startG = data[startIndex+1], startB = data[startIndex+2];
    const TOLERANCE = 25; // Turunkan dari 40 ke 25 agar tidak bocor keluar garis hitam
    
    // Canvas untuk Mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width; maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if(!maskCtx) return;
    const maskImageData = maskCtx.createImageData(width, height);
    const maskData = maskImageData.data;

    // BFS Flood Fill
    const stack = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Int32Array(width * height); // Optimasi memory
    
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const pIdx = cy * width + cx;
      if (visited[pIdx]) continue;
      visited[pIdx] = 1;
      
      const idx = pIdx * 4;
      const diff = Math.abs(data[idx] - startR) + Math.abs(data[idx+1] - startG) + Math.abs(data[idx+2] - startB);
      
      if (diff < TOLERANCE) {
        // Tandai putih di maskData
        maskData[idx] = 255; maskData[idx+1] = 255; maskData[idx+2] = 255; maskData[idx+3] = 255; 
        
        if (cx > 0) stack.push([cx - 1, cy]);
        if (cx < width - 1) stack.push([cx + 1, cy]);
        if (cy > 0) stack.push([cx, cy - 1]);
        if (cy < height - 1) stack.push([cx, cy + 1]);
      }
    }

    // --- FITUR: DILATION (Radius diperkecil agar tidak makan outline) ---
    const applyDilation = (data: Uint8ClampedArray, w: number, h: number, radius: number) => {
      const copy = new Uint8ClampedArray(data); 
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          if (copy[idx + 3] > 0) { 
             for (let dy = -radius; dy <= radius; dy++) {
               for (let dx = -radius; dx <= radius; dx++) {
                 const ny = y + dy; const nx = x + dx;
                 if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                   const nIdx = (ny * w + nx) * 4;
                   data[nIdx] = 255; data[nIdx+1] = 255; data[nIdx+2] = 255; data[nIdx+3] = 255;
                 }
               }
             }
          }
        }
      }
    };

    applyDilation(maskData, width, height, 1); // Kecilkan radius ke 1 atau 2 agar tidak menutupi outline dialog

    maskCtx.putImageData(maskImageData, 0, 0);
    
    const maskObj: any = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      x: 0, y: 0, width: 100, height: 100,
      fill: '#ffffff',
      maskDataUrl: maskCanvas.toDataURL(),
      opacity: 1
    };
    
    callbacks.current.onAddSmartMask(maskObj);
  };

  // --- 1. SETUP PAPAN TULIS (Logika Original Backup) ---
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

    fCanvas.on('mouse:down', (e: any) => {
      // Logic Smart Fill
      if (callbacks.current.isSmartFill && callbacks.current.onAddSmartMask && e.pointer) {
        fCanvas.discardActiveObject(); 
        fCanvas.requestRenderAll();
        performSmartFill(e.pointer.x, e.pointer.y);
      }
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
          callbacks.current.onUpdateText(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width*obj.scaleX });
        } else if (obj.data.type === 'mask') {
          callbacks.current.onUpdateMask(obj.data.id, { x: (obj.left/bW)*100, y: (obj.top/bH)*100, width: obj.width*obj.scaleX, height: obj.height*obj.scaleY });
        }
      }
    });

    return () => fCanvas.dispose();
  }, [page.id]);

  // --- 2. PASANG GAMBAR BACKGROUND (Logika Original Backup) ---
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

  // --- 3. GAMBAR TEKS & MASK (DENGAN PERBAIKAN) ---
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;

    const ids = [...page.textObjects.map(t => t.id), ...(page.masks || []).map(m => m.id)];
    fCanvas.getObjects().forEach((o: any) => {
      if (o.data?.id && !ids.includes(o.data.id)) fCanvas.remove(o);
    });

    page.textObjects.forEach((obj) => {
      // FIX 1: HIDE NAMA GLOBAL (Cari semua Nama : di mana saja)
      let content = obj.originalText;
      if (hideLabels) {
        content = content.replace(/(?:\r?\n|^|,\s*)[^:\n,]+:\s*/g, (match) => {
           return match.startsWith(',') ? ', ' : '';
        });
      }

      const posX = (obj.x / 100) * containerSize.width;
      const posY = (obj.y / 100) * containerSize.height;
      
      // FIX 2: SINKRONISASI LEBAR & PADDING (Sama dengan Logika Download)
      // Mengubah -80 menjadi -40 supaya box lebih lebar (tidak ramping/tinggi)
      const horizontalPadding = (obj.paddingLeft || 0) + (obj.paddingRight || 0);
      const baseWidth = importMode === 'full' ? containerSize.width - 40 : obj.width;
      const textWidth = Math.max(50, baseWidth - horizontalPadding);

      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
      const tProps = { 
        width: textWidth,
        fontSize: obj.fontSize, fill: obj.color, textAlign: 'center', 
        originX: 'center', originY: 'center', fontFamily: obj.fontFamily, text: content, 
        stroke: obj.outlineColor, strokeWidth: obj.outlineWidth,
        paintFirst: 'stroke', strokeLineJoin: 'round',
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur, opacity: obj.glowOpacity }) 
      };

      if (!fObj) {
        const newTxt = new fabric.Textbox(content, { ...tProps, left: posX, top: posY, data: { id: obj.id, type: 'text' } });
        fCanvas.add(newTxt);
        fObj = newTxt;
      } else if (!fObj.isEditing) {
        fObj.set({ ...tProps, left: posX, top: posY });
      }

      // FIX 3: ANTI-NABRAK BAWAH (Rem Otomatis)
      if (fObj) {
        const halfH = (fObj.height * fObj.scaleY) / 2;
        const maxTop = containerSize.height - (obj.paddingBottom || 0) - halfH;
        const minTop = (obj.paddingTop || 0) + halfH;
        
        let safeTop = fObj.top;
        if (safeTop > maxTop) safeTop = maxTop;
        if (safeTop < minTop) safeTop = minTop;
        
        if (fObj.top !== safeTop) {
          fObj.set({ top: safeTop }).setCoords();
        }
      }
    });

    (page.masks || []).forEach((mask) => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === mask.id && o.data?.type === 'mask');
      const mProps = { left: (mask.x/100)*containerSize.width, top: (mask.y/100)*containerSize.height, width: mask.width, height: mask.height, fill: mask.fill, originX: 'center', originY: 'center' };
      if (mask.type === 'image' && mask.maskDataUrl) {
         // Render Image Mask (Smart Bucket)
         if (!fObj) {
           fabric.Image.fromURL(mask.maskDataUrl, (img: any) => {
             img.set({
               left: 0, top: 0, 
               scaleX: containerSize.width / img.width,
               scaleY: containerSize.height / img.height,
               selectable: true, evented: true,
               data: { id: mask.id, type: 'mask' },
               opacity: mask.opacity ?? 1 // Apply Opacity
             });
             fCanvas.add(img);
             fCanvas.sendToBack(img);
           });
         } else {
             // Update opacity jika object sudah ada
             fObj.set({ opacity: mask.opacity ?? 1 });
         }
      } else {
        // Render Rect Mask (Manual)
        const rectProps = { 
           ...mProps,
           opacity: mask.opacity ?? 1 // Apply Opacity
        };
        if (!fObj) fCanvas.add(new fabric.Rect({ ...rectProps, data: { id: mask.id, type: 'mask' } }));
        else fObj.set(rectProps);
      }
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