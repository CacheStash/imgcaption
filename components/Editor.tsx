import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject, ImportMode, MaskObject } from '../types';
import { cleanText } from '../utils/helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextIds: string[];
  selectedMaskIds: string[];
  importMode: ImportMode;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onUpdateMask: (maskId: string, updates: Partial<MaskObject>) => void;
  onSelectText: (ids: string[]) => void;
  onSelectMask: (ids: string[]) => void;
  onRecordHistory: () => void;
  onResize: (width: number) => void;
  isSmartFill: boolean;
  onAddSmartMask: (mask: MaskObject) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ 
page, hideLabels, selectedTextIds, selectedMaskIds, importMode, 
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

   // Styling Marquee Selection (Adobe Illustrator Style)
    fCanvas.selectionColor = 'rgba(59, 130, 246, 0.15)';
    fCanvas.selectionBorderColor = 'rgba(59, 130, 246, 0.8)';
    fCanvas.selectionLineWidth = 1;

    const handleSelection = (e: any) => {
      // Menangkap array objek yang diseleksi (baik klik tunggal maupun marquee)
      const selected = e.selected || (e.target ? [e.target] : []);
      const textIds = selected.filter((o: any) => o.data?.type === 'text').map((o: any) => o.data.id);
      const maskIds = selected.filter((o: any) => o.data?.type === 'mask').map((o: any) => o.data.id);
      
      // Update state seleksi global dengan array ID
      if (textIds.length > 0) callbacks.current.onSelectText(textIds);
      else if (maskIds.length > 0) callbacks.current.onSelectMask(maskIds);
    };

    fCanvas.on('selection:created', handleSelection);
    fCanvas.on('selection:updated', handleSelection);
    fCanvas.on('selection:cleared', () => { 
      callbacks.current.onSelectText([]); 
      callbacks.current.onSelectMask([]); 
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
        const contRatio = contWidth / contHeight;
        
        let finalWidth, finalHeight;
        
        // Logika Best Fit untuk menangani segala rasio gambar
        if (imgRatio > contRatio) {
          finalWidth = contWidth;
          finalHeight = contWidth / imgRatio;
        } else {
          finalHeight = contHeight;
          finalWidth = contHeight * imgRatio;
        }

        fCanvas.setDimensions({ width: finalWidth, height: finalHeight });
        img.set({ 
          scaleX: finalWidth / img.width, 
          scaleY: finalHeight / img.height, 
          left: 0, top: 0, 
          selectable: false, 
          evented: false 
        });

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
      
      let finalX = posX;
      let finalY = posY;
      let originX = 'center';
      let originY = 'center';

      // Tentukan Posisi Horizontal & Anchor
      if (obj.alignment === 'left') { finalX = (obj.paddingLeft || 0); originX = 'left'; }
      else if (obj.alignment === 'right') { finalX = containerSize.width - (obj.paddingRight || 0); originX = 'right'; }
      else if (obj.alignment === 'center') { finalX = containerSize.width / 2; originX = 'center'; }
      else { originX = 'center'; } // Mode 'none'

      // Tentukan Posisi Vertikal & Anchor
      if (obj.verticalAlignment === 'top') { finalY = (obj.paddingTop || 0); originY = 'top'; }
      else if (obj.verticalAlignment === 'bottom') { finalY = containerSize.height - (obj.paddingBottom || 0); originY = 'bottom'; }
      else if (obj.verticalAlignment === 'middle') { finalY = containerSize.height / 2; originY = 'center'; }
      else { originY = 'center'; } // Mode 'none'

      // 2. STABILITAS DIMENSI
      // Gunakan obj.width asli agar tidak berubah ukuran saat snapping diganti
      const textWidth = importMode === 'full' 
        ? Math.max(50, containerSize.width - (obj.paddingLeft || 0) - (obj.paddingRight || 0)) 
        : obj.width;

      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id && o.data?.type === 'text');
      const tProps = { 
        width: textWidth,
        fontSize: obj.fontSize, 
        fill: obj.color, 
        textAlign: obj.textAlign || 'center', 
        originX: originX,   
        originY: originY, 
        backgroundColor: '',      // Benar-benar kosongkan
        textBackgroundColor: '',  // Benar-benar kosongkan
        fontFamily: obj.fontFamily, 
        text: content, 
        fontWeight: obj.fontWeight || 'normal',
        visible: obj.visible !== false, 
        scaleX: 1, 
        scaleY: 1,
        stroke: obj.outlineColor, 
        strokeWidth: obj.outlineWidth,
        paintFirst: 'stroke', 
        strokeLineJoin: 'round',
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur, opacity: obj.glowOpacity }),
        padding: 0 
      };

      if (!fObj) {
        const newTxt = new fabric.Textbox(content, { ...tProps, left: finalX, top: finalY, data: { id: obj.id, type: 'text' } });
        fCanvas.add(newTxt);
        fObj = newTxt;
      } else if (!fObj.isEditing) {
       // Jika objek ada di dalam grup (ActiveSelection/Marquee), 
        // kita harus menghitung ulang koordinatnya agar tetap Snap ke Kanvas secara absolut.
        if (fObj.group) {
          const localPoint = fabric.util.transformPoint(
            { x: finalX, y: finalY },
            fabric.util.invertTransform(fObj.group.calcTransformMatrix())
          );
          fObj.set({ ...tProps, left: localPoint.x, top: localPoint.y });
        } else {
          fObj.set({ ...tProps, left: finalX, top: finalY });
        }
        
        fObj.setCoords(); 
      }
      
      });
    (page.masks || []).forEach((mask) => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === mask.id && o.data?.type === 'mask');
      const mProps = { left: (mask.x/100)*containerSize.width, top: (mask.y/100)*containerSize.height, width: mask.width, height: mask.height, fill: mask.fill, originX: 'center', originY: 'center' };
      // Properti dasar untuk Rect/Oval
      // FIX: Deteksi perubahan tipe bentuk (Square ke Oval atau sebaliknya)
      // Jika di state adalah 'oval' tapi di kanvas bukan 'ellipse', maka harus diganti.
      const isTypeMismatch = fObj && (
        (mask.shape === 'oval' && fObj.type !== 'ellipse') || 
        (mask.shape !== 'oval' && fObj.type === 'rect')
      );

      if (isTypeMismatch) {
        fCanvas.remove(fObj);
        fObj = null; // Paksa masuk ke logika pembuatan objek baru (!fObj) di bawah
      }

      const shapeProps = { 
        ...mProps, 
        opacity: mask.opacity ?? 1, 
        visible: mask.visible !== false,
        stroke: mask.stroke || '#000000', 
        strokeWidth: mask.strokeWidth || 0,
        scaleX: 1, scaleY: 1 
      };

      if (mask.type === 'image' && mask.maskDataUrl) {
         // Render Image Mask (Smart Fill)
         if (!fObj) {
           fabric.Image.fromURL(mask.maskDataUrl, (img: any) => {
             img.set({ 
               left: 0, top: 0, 
               scaleX: containerSize.width / img.width, 
               scaleY: containerSize.height / img.height, 
               selectable: true, evented: true, 
               data: { id: mask.id, type: 'mask' },
               opacity: mask.opacity ?? 1,
               visible: mask.visible !== false
             });
             fCanvas.add(img); fCanvas.sendToBack(img);
           });
         } else {
           fObj.set({ opacity: mask.opacity ?? 1, visible: mask.visible !== false });
         }
      } else {
        // Render Manual Mask (Rect / Oval)
        if (!fObj) {
          const shapeObj = mask.shape === 'oval' 
            ? new fabric.Ellipse({ ...shapeProps, rx: mask.width/2, ry: mask.height/2, data: { id: mask.id, type: 'mask' } })
            : new fabric.Rect({ ...shapeProps, data: { id: mask.id, type: 'mask' } });
          fCanvas.add(shapeObj);
        } else {
          fObj.set(shapeProps);
          // Update radius jika bentuknya oval agar mengikuti resize
          if (fObj.type === 'ellipse') {
            fObj.set({ rx: mask.width / 2, ry: mask.height / 2 });
          }
        }
      }
    });

    fCanvas.getObjects().forEach((obj: any) => { 
      if (obj.data?.type === 'mask') fCanvas.sendToBack(obj);
      if (obj.data?.type === 'text') fCanvas.bringToFront(obj); 
    });
// Memaksa Fabric memperbarui kotak biru seleksi jika ada perubahan snapping pada objek di dalamnya
    const activeSelection = fCanvas.getActiveObject();
    if (activeSelection && activeSelection.type === 'activeSelection') {
      activeSelection.addWithUpdate();
    }


    fCanvas.requestRenderAll();
  }, [page.textObjects, page.masks, containerSize, hideLabels, importMode]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;