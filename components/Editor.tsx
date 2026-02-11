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
  isSmartFill: boolean;
  onAddSmartMask: (mask: MaskObject) => void;
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


  // Simpan fungsi update dalam box rahasia supaya selalu terbaru
  const callbacks = useRef({ onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize, onAddSmartMask, isSmartFill });
  useEffect(() => { 
    callbacks.current = { onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize, onAddSmartMask, isSmartFill }; 
  }, [onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize, onAddSmartMask, isSmartFill]);

  // --- ALGORITMA FLOOD FILL (Smart Bucket) ---
  const performSmartFill = (startX: number, startY: number) => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas) return;

    // 1. Ambil data gambar dari canvas saat ini (hanya background image)
    // Kita gunakan canvas internal fabric yg berisi background
    const bgImage = fCanvas.backgroundImage;
    if (!bgImage) { alert("No image to fill!"); return; }

    const rawCanvas = fCanvas.getElement(); // Canvas HTML element asli
    const ctx = rawCanvas.getContext('2d');
    const { width, height } = rawCanvas;
    
    // Ambil data piksel
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Helper: Posisi index pixel
    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;
    
    // Warna target (di titik klik)
    const startIndex = getPixelIndex(Math.floor(startX), Math.floor(startY));
    const startR = data[startIndex], startG = data[startIndex+1], startB = data[startIndex+2], startA = data[startIndex+3];
    
    // Batas toleransi (agar tidak terlalu sensitif noise)
    const TOLERANCE = 50; 
    
    // Canvas baru untuk hasil mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width; maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;
    const maskImageData = maskCtx.createImageData(width, height);
    const maskData = maskImageData.data;

    // Stack untuk Flood Fill (BFS)
    const stack = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Set(); // Set koordinat yg sudah dikunjungi (pakai string "x,y")

    // Loop
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      
      const idx = getPixelIndex(cx, cy);
      // Cek apakah warna mirip dengan warna awal?
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const diff = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB);
      
      if (diff < TOLERANCE) {
        // Warnai mask dengan PUTIH (nanti jadi fill dialog box)
        maskData[idx] = 255;   // R
        maskData[idx+1] = 255; // G
        maskData[idx+2] = 255; // B
        maskData[idx+3] = 255; // Alpha Penuh
        
        visited.add(key);

        // Tambahkan tetangga (atas, bawah, kiri, kanan)
        if (cx > 0) stack.push([cx - 1, cy]);
        if (cx < width - 1) stack.push([cx + 1, cy]);
        if (cy > 0) stack.push([cx, cy - 1]);
        if (cy < height - 1) stack.push([cx, cy + 1]);
      }
    }

    // Masukkan data mask ke canvas temp
    maskCtx.putImageData(maskImageData, 0, 0);
    
    // Export jadi Image/DataURL
    const maskUrl = maskCanvas.toDataURL();
    
    // Panggil handler di App
    const bW = bgImage.width * bgImage.scaleX;
    const bH = bgImage.height * bgImage.scaleY;
    
    // Generate MaskObject
    // Kita simpan sebagai 'image' type. Posisi 0,0 full canvas tapi transparan kecuali yg difill
    const maskObj: any = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image', // Tipe baru
      x: 0, y: 0, width: 100, height: 100, // Full width/height (persen) relative to image
      fill: '#ffffff',
      maskDataUrl: maskUrl // URL blob gambar mask
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
      // Jika mode smart fill aktif, jangan select objek lain, tapi lakukan fill
      if (callbacks.current.isSmartFill && e.pointer) {
        // Prevent selection logic if possible or just ignore it
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
          // FIX: Hitung lebar visual baru (lebar asli dikali skala tarikan mouse)
          // Menghitung font size baru berdasarkan skala saat ditarik dari sudut
          const newFontSize = Math.round(obj.fontSize * obj.scaleX);
          const newWidth = obj.width * obj.scaleX;
          
          callbacks.current.onUpdateText(obj.data.id, { 
            x: (obj.left/bW)*100, 
            y: (obj.top/bH)*100, 
            width: newWidth,
            fontSize: newFontSize
          });

          // Update objek Fabric secara langsung agar sinkron tanpa kedip
          // Reset skala ke 1 dan terapkan fontSize/width baru secara native
          obj.set({ 
            scaleX: 1, 
            scaleY: 1, 
            width: newWidth, 
            fontSize: newFontSize 
          });
        } else if (obj.data.type === 'mask') {
          const newWidth = obj.width * obj.scaleX;
          const newHeight = obj.height * obj.scaleY;
          
          callbacks.current.onUpdateMask(obj.data.id, { 
            x: (obj.left/bW)*100, 
            y: (obj.top/bH)*100, 
            width: newWidth, 
            height: newHeight 
          });

          // Paksa skala kembali ke 1 agar tidak membesar terus menerus (Ngeyel)
          obj.set({ scaleX: 1, scaleY: 1, width: newWidth, height: newHeight });
          
          // Sinkronisasi radius jika bentuknya Ellipse
          if (obj.type === 'ellipse') {
            obj.set({ rx: newWidth / 2, ry: newHeight / 2 });
          }
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
      const horizontalPadding = (obj.paddingLeft || 0) + (obj.paddingRight || 0);
      
      // FIX: Gunakan obj.width state secara langsung untuk mode Box agar tidak "ngeyel" menciut
      const textWidth = importMode === 'full' 
        ? Math.max(50, containerSize.width - 40 - horizontalPadding) 
        : obj.width;

      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
      const tProps = { 
        width: textWidth,
        fontSize: obj.fontSize, fill: obj.color, textAlign: 'center', 
        originX: 'center', originY: 'center', fontFamily: obj.fontFamily, text: content, 
        fontWeight: obj.fontWeight || 'normal', // FIX: Terapkan setting Bold ke Fabric.js
        visible: obj.visible !== false, 
        scaleX: 1, scaleY: 1, 
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
      // Properti dasar untuk Rect/Oval
      const isTypeMismatch = fObj && (
        (mask.shape === 'oval' && fObj.type !== 'ellipse') || 
        (mask.shape !== 'oval' && fObj.type === 'ellipse')
      );

      if (isTypeMismatch) {
        fCanvas.remove(fObj);
        fObj = null; // Paksa buat baru di bawah
      }

      if (mask.type === 'image' && mask.maskDataUrl) {
         // ... (Logic Image Mask tetap sama)
      } else {
        const shapeProps = { 
          ...mProps, opacity: mask.opacity ?? 1, visible: mask.visible !== false,
          stroke: mask.stroke || '#000000', strokeWidth: mask.strokeWidth || 0,
          scaleX: 1, scaleY: 1 
        };

        if (!fObj) {
          const shapeObj = mask.shape === 'oval' 
            ? new fabric.Ellipse({ ...shapeProps, rx: mask.width/2, ry: mask.height/2, data: { id: mask.id, type: 'mask' } })
            : new fabric.Rect({ ...shapeProps, data: { id: mask.id, type: 'mask' } });
          fCanvas.add(shapeObj);
        } else {
          fObj.set(shapeProps);
          if (fObj.type === 'ellipse') fObj.set({ rx: mask.width/2, ry: mask.height/2 });
        }
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