import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject, ImportMode, MaskObject } from '../types';
import { cleanText } from '../utils/helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextId: string | null;
  selectedMaskId?: string | null; // Added for Masking
  importMode: ImportMode;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onUpdateMask: (maskId: string, updates: Partial<MaskObject>) => void; // Added for Masking
  onSelectText: (id: string | null) => void;
  onSelectMask: (id: string | null) => void; // Added for Masking
  onRecordHistory: () => void;
  onResize: (width: number) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ 
  page, 
  hideLabels, 
  selectedTextId, 
  selectedMaskId, 
  importMode, 
  onUpdateText, 
  onUpdateMask, 
  onSelectText, 
  onSelectMask, 
  onRecordHistory, 
  onResize 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep callbacks fresh
  const callbacks = useRef({ onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize });
  useEffect(() => { 
    callbacks.current = { onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize }; 
  }, [onUpdateText, onUpdateMask, onSelectText, onSelectMask, onRecordHistory, onResize]);

  // Function to clamp object position within image boundaries + padding
  const clampPosition = useCallback((obj: any, data: TextObject) => {
    if (!containerSize.width || !containerSize.height) return;

    const width = obj.width * obj.scaleX;
    const height = obj.height * obj.scaleY;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const minLeft = data.paddingLeft + halfWidth;
    const maxLeft = containerSize.width - data.paddingRight - halfWidth;
    const minTop = data.paddingTop + halfHeight;
    const maxTop = containerSize.height - data.paddingBottom - halfHeight;

    let newLeft = obj.left;
    let newTop = obj.top;

    if (maxLeft > minLeft) {
      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    } else {
      newLeft = (minLeft + maxLeft) / 2;
    }

    if (maxTop > minTop) {
      newTop = Math.max(minTop, Math.min(newTop, maxTop));
    } else {
      newTop = (minTop + maxTop) / 2;
    }

    if (newLeft !== obj.left || newTop !== obj.top) {
      obj.set({ left: newLeft, top: newTop });
      obj.setCoords();
    }
  }, [containerSize]);

  // Enhanced stacking logic: Masks at bottom, Text on top, Text non-overlapping
  const resolveStacking = useCallback((fCanvas: any) => {
    // 1. Layer Ordering: Masks to back, Text to front
    fCanvas.getObjects().forEach((obj: any) => {
      if (obj.data?.type === 'mask') fCanvas.sendToBack(obj);
      if (obj.data?.type === 'text') fCanvas.bringToFront(obj);
    });

    // 2. Text Overlap Prevention (Existing Feature)
    const textboxes = fCanvas.getObjects().filter((o: any) => o.data?.id && o.data?.type === 'text');
    if (textboxes.length <= 1) return;
    
    textboxes.sort((a: any, b: any) => a.top - b.top);
    const PADDING = 15;
    let changed = false;
    
    for (let i = 0; i < textboxes.length; i++) {
      const current = textboxes[i];
      const currentRect = current.getBoundingRect();
      for (let j = 0; j < i; j++) {
        const above = textboxes[j];
        const aboveRect = above.getBoundingRect();
        const overlapX = (currentRect.left < aboveRect.left + aboveRect.width) && 
                         (currentRect.left + currentRect.width > aboveRect.left);
        if (overlapX && currentRect.top < aboveRect.top + aboveRect.height + PADDING) {
          current.set({ top: aboveRect.top + aboveRect.height + PADDING });
          current.setCoords();
          changed = true;
        }
      }
    }
    if (changed) fCanvas.requestRenderAll();
  }, []);

  // Initial Canvas Setup
  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { 
      backgroundColor: '#0f172a', 
      preserveObjectStacking: true, 
      selection: true,
      renderOnAddRemove: true
    });
    fabricCanvasRef.current = fCanvas;

    // Handle Selection (Text & Mask)
    const handleSelection = (e: any) => {
      if (isRenderingRef.current) return;
      const activeObj = e.selected ? e.selected[0] : e.target;
      if (activeObj?.data?.type === 'text') {
        callbacks.current.onSelectText(activeObj.data.id);
        callbacks.current.onSelectMask(null);
      } else if (activeObj?.data?.type === 'mask') {
        callbacks.current.onSelectMask(activeObj.data.id);
        callbacks.current.onSelectText(null);
      }
    };

    fCanvas.on('selection:created', handleSelection);
    fCanvas.on('selection:updated', handleSelection);
    fCanvas.on('selection:cleared', () => { 
      if (!isRenderingRef.current) {
        callbacks.current.onSelectText(null);
        callbacks.current.onSelectMask(null);
      }
    });

    // Handle Modifications (Move/Resize)
    const handleModified = (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
        callbacks.current.onRecordHistory();
        
        const bgImg = fCanvas.backgroundImage;
        const bgWidth = bgImg ? bgImg.width * bgImg.scaleX : 1;
        const bgHeight = bgImg ? bgImg.height * bgImg.scaleY : 1;

        if (obj.data.type === 'text') {
          const textData = page.textObjects.find(t => t.id === obj.data.id);
          if (textData) clampPosition(obj, textData);
          
          const relX = (obj.left / bgWidth) * 100;
          const relY = (obj.top / bgHeight) * 100;
          const newWidth = obj.width * obj.scaleX;
          callbacks.current.onUpdateText(obj.data.id, { x: relX, y: relY, width: newWidth });
        } 
        else if (obj.data.type === 'mask') {
          const relX = (obj.left / bgWidth) * 100;
          const relY = (obj.top / bgHeight) * 100;
          const newWidth = obj.width * obj.scaleX;
          const newHeight = obj.height * obj.scaleY;
          callbacks.current.onUpdateMask(obj.data.id, { x: relX, y: relY, width: newWidth, height: newHeight });
        }
        resolveStacking(fCanvas);
      }
    };
    
    // Handle Text Typing
    const handleTextChanged = (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id && obj.data.type === 'text') {
        callbacks.current.onUpdateText(obj.data.id, { originalText: obj.text });
        resolveStacking(fCanvas);
      }
    };

    fCanvas.on('object:modified', handleModified);
    fCanvas.on('text:changed', handleTextChanged);
    
    return () => { 
      if (fabricCanvasRef.current) { 
        fabricCanvasRef.current.dispose(); 
        fabricCanvasRef.current = null; 
      } 
    };
  }, [resolveStacking, clampPosition, page.textObjects, page.masks]); // Removed page.id to prevent full re-init on minor updates

  // Sync Background Image
  const syncCanvasSize = useCallback(() => {
    if (!containerRef.current || !fabricCanvasRef.current) return;
    const fCanvas = fabricCanvasRef.current;
    const container = containerRef.current;
    const { width: contWidth, height: contHeight } = container.getBoundingClientRect();

    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!fCanvas || !img) return;
      
      const imgRatio = img.width / img.height;
      const containerRatio = contWidth / contHeight;

      let finalWidth, finalHeight;
      if (imgRatio > containerRatio) {
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
        left: 0, top: 0, selectable: false, evented: false
      });

      fCanvas.setBackgroundImage(img, () => {
        setContainerSize({ width: finalWidth, height: finalHeight });
        callbacks.current.onResize(finalWidth);
        fCanvas.requestRenderAll();
      });
    }, { crossOrigin: 'anonymous' });
  }, [page.imageUrl]);

  useEffect(() => {
    syncCanvasSize();
    const handleResize = () => syncCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [syncCanvasSize]);

  // Sync Objects (Text & Masks)
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    
    isRenderingRef.current = true;
    const currentObjects = fCanvas.getObjects();
    
    // Cleanup removed objects
    const textIds = page.textObjects.map(t => t.id);
    const maskIds = (page.masks || []).map(m => m.id);
    
    currentObjects.forEach((obj: any) => { 
      if (obj.data?.id) {
        if (obj.data.type === 'text' && !textIds.includes(obj.data.id)) fCanvas.remove(obj);
        if (obj.data.type === 'mask' && !maskIds.includes(obj.data.id)) fCanvas.remove(obj);
      }
    });

    // Render Masks (Added Feature)
    (page.masks || []).forEach((mask) => {
      let fObj = fCanvas.getObjects().find((o: any) => o.data?.id === mask.id);
      
      const props = {
        left: (mask.x / 100) * containerSize.width,
        top: (mask.y / 100) * containerSize.height,
        width: mask.width,
        height: mask.height,
        fill: mask.fill,
        originX: 'center',
        originY: 'center',
        strokeWidth: 0
      };

      if (!fObj) {
        fObj = new fabric.Rect({ ...props, data: { id: mask.id, type: 'mask' } });
        fCanvas.add(fObj);
      } else if (fObj !== fCanvas.getActiveObject()) {
        fObj.set(props);
      }
    });

    // Render Texts
    page.textObjects.forEach((obj) => {
      const displayContent = cleanText(obj.originalText, hideLabels);
      let fabricObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      
      const finalWidth = importMode === 'full' 
        ? containerSize.width - (obj.paddingLeft + obj.paddingRight + 40)
        : obj.width;

      const posX = (obj.x / 100) * containerSize.width;
      const posY = (obj.y / 100) * containerSize.height;

      const props = {
        left: posX,
        top: posY,
        width: finalWidth,
        fontSize: obj.fontSize,
        fill: obj.color,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        stroke: obj.outlineColor,
        strokeWidth: obj.outlineWidth || 0,
        strokeUniform: true,
        paintFirst: 'stroke',
        fontFamily: obj.fontFamily || 'Inter',
        text: displayContent,
        editable: true,
        shadow: new fabric.Shadow({ 
          color: obj.glowColor, 
          blur: obj.glowBlur || 0, 
          offsetX: 0, offsetY: 0, opacity: obj.glowOpacity, nonScaling: true 
        })
      };

      if (!fabricObj) {
        fabricObj = new fabric.Textbox(displayContent, { ...props, data: { id: obj.id, type: 'text' }, lockScalingY: true });
        fCanvas.add(fabricObj);
      } else {
        if (fabricObj !== fCanvas.getActiveObject() || !fabricObj.isEditing) {
          fabricObj.set(props);
        } else {
          // While editing, update style but not dimensions/text to prevent cursor jump
          fabricObj.set({ 
            fontSize: props.fontSize, fill: props.fill, stroke: props.stroke, 
            strokeWidth: props.strokeWidth, fontFamily: props.fontFamily, shadow: props.shadow 
          }); 
        }
      }
      clampPosition(fabricObj, obj);
    });

    // Restore Selection
    const activeText = fCanvas.getObjects().find((o: any) => o.data?.id === selectedTextId);
    const activeMask = fCanvas.getObjects().find((o: any) => o.data?.id === selectedMaskId);
    
    if (activeText && fCanvas.getActiveObject() !== activeText) fCanvas.setActiveObject(activeText);
    else if (activeMask && fCanvas.getActiveObject() !== activeMask) fCanvas.setActiveObject(activeMask);
    else if (!selectedTextId && !selectedMaskId) fCanvas.discardActiveObject();

    resolveStacking(fCanvas);
    fCanvas.requestRenderAll();
    
    const timer = setTimeout(() => { isRenderingRef.current = false; }, 60);
    return () => clearTimeout(timer);
  }, [page.textObjects, page.masks, containerSize, hideLabels, selectedTextId, selectedMaskId, importMode, resolveStacking, clampPosition]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;