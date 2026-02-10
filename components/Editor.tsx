
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Page, TextObject } from '../types';
import { cleanText } from '../utils/helpers';

interface EditorProps {
  page: Page;
  hideLabels: boolean;
  selectedTextId: string | null;
  onUpdateText: (textId: string, updates: Partial<TextObject>) => void;
  onSelectText: (id: string | null) => void;
  onRecordHistory: () => void;
  onResize: (width: number) => void;
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ page, hideLabels, selectedTextId, onUpdateText, onSelectText, onRecordHistory, onResize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const callbacks = useRef({ onUpdateText, onSelectText, onRecordHistory, onResize });
  useEffect(() => { callbacks.current = { onUpdateText, onSelectText, onRecordHistory, onResize }; }, [onUpdateText, onSelectText, onRecordHistory, onResize]);

  // Function to clamp object position within image boundaries + padding
  const clampPosition = useCallback((obj: any, data: TextObject) => {
    if (!containerSize.width || !containerSize.height) return;

    // Use current dimensions of the textbox
    const width = obj.width * obj.scaleX;
    const height = obj.height * obj.scaleY;
    
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Boundary constraints: respect padding as a "no-go" zone from the image edges
    const minLeft = data.paddingLeft + halfWidth;
    const maxLeft = containerSize.width - data.paddingRight - halfWidth;
    const minTop = data.paddingTop + halfHeight;
    const maxTop = containerSize.height - data.paddingBottom - halfHeight;

    let newLeft = obj.left;
    let newTop = obj.top;

    if (maxLeft > minLeft) {
      if (newLeft < minLeft) newLeft = minLeft;
      if (newLeft > maxLeft) newLeft = maxLeft;
    } else {
      newLeft = (minLeft + maxLeft) / 2;
    }

    if (maxTop > minTop) {
      if (newTop < minTop) newTop = minTop;
      if (newTop > maxTop) newTop = maxTop;
    } else {
      newTop = (minTop + maxTop) / 2;
    }

    if (newLeft !== obj.left || newTop !== obj.top) {
      obj.set({ left: newLeft, top: newTop });
      obj.setCoords();
    }
  }, [containerSize]);

  // Stacking logic
  const resolveStacking = useCallback((fCanvas: any) => {
    const textboxes = fCanvas.getObjects().filter((o: any) => o.data?.id);
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

    const handleSelection = (e: any) => {
      if (isRenderingRef.current) return;
      const activeObj = e.selected ? e.selected[0] : e.target;
      if (activeObj && activeObj.data?.id) callbacks.current.onSelectText(activeObj.data.id);
    };

    fCanvas.on('selection:created', handleSelection);
    fCanvas.on('selection:updated', handleSelection);
    fCanvas.on('selection:cleared', () => { if (!isRenderingRef.current) callbacks.current.onSelectText(null); });

    const handleModified = (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
        callbacks.current.onRecordHistory();
        const textData = page.textObjects.find(t => t.id === obj.data.id);
        if (textData) clampPosition(obj, textData);
        resolveStacking(fCanvas);
        const bgImg = fCanvas.backgroundImage;
        if (bgImg) {
          const bgWidth = bgImg.width * bgImg.scaleX;
          const bgHeight = bgImg.height * bgImg.scaleY;
          const relX = (obj.left / bgWidth) * 100;
          const relY = (obj.top / bgHeight) * 100;
          const newWidth = obj.width * obj.scaleX;
          callbacks.current.onUpdateText(obj.data.id, { x: relX, y: relY, width: newWidth });
        }
      }
    };
    
    const handleTextChanged = (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
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
  }, [resolveStacking, clampPosition, page.id]);

  // Sync Background Image using fabric.Image.fromURL (more reliable)
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
        left: 0,
        top: 0,
        selectable: false,
        evented: false
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

  // Sync Text Objects
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    
    isRenderingRef.current = true;
    const currentObjects = fCanvas.getObjects();
    const objectIds = page.textObjects.map(t => t.id);
    
    currentObjects.forEach((obj: any) => { 
      if (obj.data?.id && !objectIds.includes(obj.data.id)) fCanvas.remove(obj); 
    });

    page.textObjects.forEach((obj) => {
      const displayContent = cleanText(obj.originalText, hideLabels);
      let fabricObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      
      const posX = (obj.x / 100) * containerSize.width;
      const posY = (obj.y / 100) * containerSize.height;

      const props = {
        left: posX,
        top: posY,
        width: obj.width,
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
          offsetX: 0, 
          offsetY: 0, 
          opacity: obj.glowOpacity, 
          nonScaling: true 
        })
      };

      if (!fabricObj) {
        fabricObj = new fabric.Textbox(displayContent, { ...props, data: { id: obj.id }, lockScalingY: true });
        fCanvas.add(fabricObj);
      } else {
        if (fabricObj !== fCanvas.getActiveObject() || !fabricObj.isEditing) {
          fabricObj.set(props);
        } else {
          fabricObj.set({ 
            fontSize: props.fontSize, 
            fill: props.fill, 
            stroke: props.stroke, 
            strokeWidth: props.strokeWidth, 
            fontFamily: props.fontFamily, 
            shadow: props.shadow 
          }); 
        }
      }
      clampPosition(fabricObj, obj);
    });

    const activeTarget = fCanvas.getObjects().find((o: any) => o.data?.id === selectedTextId);
    if (activeTarget) { 
      if (fCanvas.getActiveObject() !== activeTarget) fCanvas.setActiveObject(activeTarget); 
    } else {
      fCanvas.discardActiveObject();
    }

    resolveStacking(fCanvas);
    fCanvas.requestRenderAll();
    
    const timer = setTimeout(() => { isRenderingRef.current = false; }, 60);
    return () => clearTimeout(timer);
  }, [page.textObjects, containerSize, hideLabels, selectedTextId, resolveStacking, clampPosition]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;
