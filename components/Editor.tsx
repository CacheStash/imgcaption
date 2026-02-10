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

  // Simpan fungsi update dalam box rahasia supaya selalu terbaru
  const callbacks = useRef({ onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize });
  useEffect(() => { 
    callbacks.current = { onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize }; 
  }, [onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize]);

  // --- FITUR: Jaga teks agar tidak keluar batas bawah ---
  const clampPosition = useCallback((obj: any, data: TextObject) => {
    if (!containerSize.height) return;
    const height = obj.height * obj.scaleY;
    const halfHeight = height / 2;
    // Hitung batas aman bawah berdasarkan paddingBottom
    const maxTop = containerSize.height - (data.paddingBottom || 0) - halfHeight;
    const minTop = (data.paddingTop || 0) + halfHeight;

    let newTop = obj.top;
    if (maxTop > minTop) newTop = Math.max(minTop, Math.min(newTop, maxTop));
    else newTop = (minTop + maxTop) / 2;

    if (newTop !== obj.top) {
      obj.set({ top: newTop });
      obj.setCoords();
    }
  }, [containerSize]);

  // --- 1. SETUP PAPAN TULIS (Hanya sekali saat halaman dibuka) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { 
      backgroundColor: '#0f172a', 
      preserveObjectStacking: true, 
      selection: true 
    });
    fabricCanvasRef.current = fCanvas;

    // Klik Teks atau Mask
    fCanvas.on('selection:created', (e: any) => {
      const obj = e.selected ? e.selected[0] : e.target;
      if (obj?.data?.type === 'text') callbacks.current.onSelectText(obj.data.id);
      else if (obj?.data?.type === 'mask') callbacks.current.onSelectMask(obj.data.id);
    });

    fCanvas.on('selection:cleared', () => { 
      callbacks.current.onSelectText(null); 
      callbacks.current.onSelectMask(null); 
    });

    // Geser atau Ubah Ukuran
    fCanvas.on('object:modified', (e: any) => {
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
      }
    });

    return () => fCanvas.dispose();
  }, [page.id, clampPosition]);

  // --- 2. PASANG GAMBAR BACKGROUND (Menggunakan Logika Original Berhasil) ---
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

  // --- 3. GAMBAR TEKS & MASK ---
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;

    // Bersihkan objek lama
    const ids = [...page.textObjects.map(t => t.id), ...(page.masks || []).map(m => m.id)];
    fCanvas.getObjects().forEach((o: any) => {
      if (o.data?.id && !ids.includes(o.data.id)) fCanvas.remove(o);
    });

    // Gambar Teks
    page.textObjects.forEach((obj) => {
      // PERBAIKAN: Logika Hide Name Global (Mencari "Nama :" di mana saja)
      let content = obj.originalText;
      if (hideLabels) {
        // Regex ini menghapus "Nama :" di awal kalimat ATAU setelah tanda koma
        content = content.replace(/(?:\r?\n|^|,\s*)[^:\n,]+:\s*/g, (match) => {
            return match.startsWith(',') ? ', ' : '';
        });
      }

      const posX = (obj.x / 100) * containerSize.width;
      const posY = (obj.y / 100) * containerSize.height;
      
      // PERBAIKAN: Sinkronisasi Lebar Box & Padding (Agar tidak tipis/terpotong)
      const horizontalPadding = (obj.paddingLeft || 0) + (obj.paddingRight || 0);
      // Merubah offset dari -80 menjadi -40 agar sinkron dengan hasil download (tidak terlalu tipis)
      const baseWidth = importMode === 'full' ? containerSize.width - 40 : obj.width;
      const textWidth = Math.max(50, baseWidth - horizontalPadding);

      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
      const tProps = { 
        width: textWidth,
        fontSize: obj.fontSize, fill: obj.color, textAlign: 'center', 
        originX: 'center', originY: 'center', fontFamily: obj.fontFamily, text: content, 
        stroke: obj.outlineColor, strokeWidth: obj.outlineWidth,
        paintFirst: 'stroke', strokeLineJoin: 'round', // OUTLINE TETAP DI LUAR
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur, opacity: obj.glowOpacity }) 
      };

      if (!fObj) {
        const newTxt = new fabric.Textbox(content, { ...tProps, left: posX, top: posY, data: { id: obj.id, type: 'text' }, lockScalingY: true });
        fCanvas.add(newTxt);
        clampPosition(newTxt, obj);
      } else if (!fObj.isEditing) {
        fObj.set({ ...tProps, left: posX, top: posY });
        clampPosition(fObj, obj);
      }
    });

    // Gambar Masker
    (page.masks || []).forEach((mask) => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === mask.id && o.data?.type === 'mask');
      const mProps = { left: (mask.x/100)*containerSize.width, top: (mask.y/100)*containerSize.height, width: mask.width, height: mask.height, fill: mask.fill, originX: 'center', originY: 'center' };
      if (!fObj) fCanvas.add(new fabric.Rect({ ...mProps, data: { id: mask.id, type: 'mask' } }));
      else fObj.set(mProps);
    });

    // Urutkan (Teks di depan)
    fCanvas.getObjects().forEach((obj: any) => { 
      if (obj.data?.type === 'mask') fCanvas.sendToBack(obj);
      if (obj.data?.type === 'text') fCanvas.bringToFront(obj); 
    });

    fCanvas.requestRenderAll();
  }, [page.textObjects, page.masks, containerSize, hideLabels, importMode, clampPosition]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;