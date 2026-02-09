
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

  // Enhanced stacking: ensuring vertical hierarchy for merged blocks
  const resolveStacking = useCallback((fCanvas: any) => {
    const textboxes = fCanvas.getObjects().filter((o: any) => o.data?.id);
    if (textboxes.length <= 1) return;

    // Stable sort based on current top position to maintain visual hierarchy
    textboxes.sort((a: any, b: any) => a.top - b.top);

    const PADDING = 15;
    let changed = false;

    for (let i = 0; i < textboxes.length; i++) {
      const current = textboxes[i];
      const currentRect = current.getBoundingRect();

      for (let j = 0; j < i; j++) {
        const above = textboxes[j];
        const aboveRect = above.getBoundingRect();

        // Horizontal intersection check
        const overlapX = (currentRect.left < aboveRect.left + aboveRect.width) && 
                         (currentRect.left + currentRect.width > aboveRect.left);
        
        // If overlapping horizontally and vertically too close, shift down
        if (overlapX && currentRect.top < aboveRect.top + aboveRect.height + PADDING) {
          current.set({ top: aboveRect.top + aboveRect.height + PADDING });
          current.setCoords();
          changed = true;
        }
      }
    }

    if (changed) fCanvas.renderAll();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fCanvas = new fabric.Canvas(canvasRef.current, { backgroundColor: '#1e293b', preserveObjectStacking: true, selection: true });
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
        resolveStacking(fCanvas);

        const bgWidth = fCanvas.backgroundImage?.width * fCanvas.backgroundImage?.scaleX || 1;
        const bgHeight = fCanvas.backgroundImage?.height * fCanvas.backgroundImage?.scaleY || 1;
        const bgLeft = fCanvas.backgroundImage?.left || 0;
        const bgTop = fCanvas.backgroundImage?.top || 0;

        fCanvas.getObjects().forEach((canvasObj: any) => {
          if (canvasObj.data?.id) {
            // Recalculate percentages while accounting for padding offsets
            const relX = ((canvasObj.left - bgLeft) / bgWidth) * 100;
            const relY = ((canvasObj.top - bgTop) / bgHeight) * 100;
            const newWidth = canvasObj.width * canvasObj.scaleX;
            canvasObj.set({ width: newWidth, scaleX: 1, scaleY: 1 });
            callbacks.current.onUpdateText(canvasObj.data.id, { x: relX, y: relY, width: newWidth });
          }
        });
      }
    };
    
    const handleTextChanged = (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
        // We only update the originalText if we are not hiding labels
        // If we ARE hiding labels, this is trickier because we need to preserve the "Name: " part.
        // For simplicity and user expectation: we update the original text directly.
        // If hideLabels is true, the user is only editing the dialogue part they see.
        callbacks.current.onUpdateText(obj.data.id, { originalText: obj.text });
        resolveStacking(fCanvas);
      }
    };

    fCanvas.on('object:modified', handleModified);
    fCanvas.on('text:changed', handleTextChanged);
    
    return () => { if (fabricCanvasRef.current) { fabricCanvasRef.current.dispose(); fabricCanvasRef.current = null; } };
  }, [resolveStacking]);

  const syncCanvasSize = useCallback(() => {
    if (!containerRef.current || !fabricCanvasRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const fCanvas = fabricCanvasRef.current;
    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!fabricCanvasRef.current || !img) return;
      const imgRatio = img.width / img.height;
      const containerRatio = width / height;
      let finalWidth, finalHeight;
      if (imgRatio > containerRatio) { finalWidth = width; finalHeight = width / imgRatio; }
      else { finalHeight = height; finalWidth = height * imgRatio; }
      fCanvas.setDimensions({ width: finalWidth, height: finalHeight });
      img.set({ scaleX: finalWidth / img.width, scaleY: finalHeight / img.height, left: 0, top: 0, selectable: false, evented: false });
      fCanvas.setBackgroundImage(img, () => { 
        fCanvas.renderAll(); 
        setContainerSize({ width: finalWidth, height: finalHeight });
        callbacks.current.onResize(finalWidth);
      });
    });
  }, [page.imageUrl]);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize]);

  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || containerSize.width === 0) return;
    isRenderingRef.current = true;
    const currentObjects = fCanvas.getObjects();
    const objectIds = page.textObjects.map(t => t.id);
    currentObjects.forEach((obj: any) => { if (obj.data?.id && !objectIds.includes(obj.data.id)) fCanvas.remove(obj); });

    page.textObjects.forEach((obj) => {
      const displayContent = cleanText(obj.originalText, hideLabels);
      let fabricObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);
      
      // Calculate position including padding offsets
      const posX = ((obj.x / 100) * containerSize.width) + (obj.paddingLeft - obj.paddingRight);
      const posY = ((obj.y / 100) * containerSize.height) + (obj.paddingTop - obj.paddingBottom);

      const props = {
        left: posX,
        top: posY,
        width: obj.width,
        fontSize: obj.fontSize,
        padding: Math.max(obj.paddingTop, obj.paddingRight, obj.paddingBottom, obj.paddingLeft),
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
        shadow: new fabric.Shadow({ color: obj.glowColor, blur: obj.glowBlur || 0, offsetX: 0, offsetY: 0, opacity: obj.glowOpacity, nonScaling: true })
      };

      if (!fabricObj) {
        fabricObj = new fabric.Textbox(displayContent, { ...props, data: { id: obj.id }, lockScalingY: true });
        fCanvas.add(fabricObj);
      } else {
        // Important: Update properties only if not currently being edited by user to avoid cursor jumping
        if (fabricObj !== fCanvas.getActiveObject() || !fabricObj.isEditing) {
          fabricObj.set(props);
        } else {
          // While editing, we only update styling, not the text itself from props
          fabricObj.set({ 
            fontSize: props.fontSize, 
            padding: props.padding,
            fill: props.fill, 
            stroke: props.stroke, 
            strokeWidth: props.strokeWidth, 
            fontFamily: props.fontFamily, 
            shadow: props.shadow 
          }); 
        }
      }
    });

    const target = fCanvas.getObjects().find((o: any) => o.data?.id === selectedTextId);
    if (target) { if (fCanvas.getActiveObject() !== target) fCanvas.setActiveObject(target); }
    else fCanvas.discardActiveObject();

    resolveStacking(fCanvas);
    fCanvas.renderAll();
    setTimeout(() => { isRenderingRef.current = false; }, 50);
  }, [page.textObjects, containerSize, hideLabels, selectedTextId, resolveStacking]);

  return (<div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[400px]"><canvas ref={canvasRef} /></div>);
};

export default Editor;
