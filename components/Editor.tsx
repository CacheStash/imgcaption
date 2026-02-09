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
}

declare const fabric: any;

const Editor: React.FC<EditorProps> = ({ 
  page, 
  hideLabels, 
  selectedTextId, 
  onUpdateText, 
  onSelectText,
  onRecordHistory
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const callbacks = useRef({ onUpdateText, onSelectText, onRecordHistory });
  useEffect(() => {
    callbacks.current = { onUpdateText, onSelectText, onRecordHistory };
  }, [onUpdateText, onSelectText, onRecordHistory]);

  const resolveStacking = (activeObj: any, fCanvas: any) => {
    const objects = fCanvas.getObjects().filter((o: any) => o.data?.id && o !== activeObj);
    const activeRect = activeObj.getBoundingRect();
    const PADDING = 10;

    let hasCollision = false;

    objects.forEach((other: any) => {
      const otherRect = other.getBoundingRect();
      const overlapX = (activeRect.left < otherRect.left + otherRect.width) && (activeRect.left + activeRect.width > otherRect.left);
      const overlapY = (activeRect.top < otherRect.top + otherRect.height) && (activeRect.top + activeRect.height > otherRect.top);

      if (overlapX && overlapY) {
        hasCollision = true;
        if (activeRect.top <= otherRect.top) {
          other.set({ top: activeRect.top + activeRect.height + PADDING });
          other.setCoords();
        } else {
          activeObj.set({ top: otherRect.top + otherRect.height + PADDING });
          activeObj.setCoords();
        }
      }
    });

    if (hasCollision) {
      fCanvas.renderAll();
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const fCanvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#1e293b',
      preserveObjectStacking: true,
      selection: true
    });

    fabricCanvasRef.current = fCanvas;

    const handleSelection = (e: any) => {
      if (isRenderingRef.current) return;
      const activeObj = e.selected ? e.selected[0] : e.target;
      if (activeObj && activeObj.data?.id) {
        callbacks.current.onSelectText(activeObj.data.id);
      }
    };

    fCanvas.on('selection:created', handleSelection);
    fCanvas.on('selection:updated', handleSelection);
    fCanvas.on('selection:cleared', () => {
      if (isRenderingRef.current) return;
      callbacks.current.onSelectText(null);
    });

    const handleModified = (e: any) => {
      if (isRenderingRef.current) return;
      const obj = e.target;
      if (obj && obj.data?.id) {
        callbacks.current.onRecordHistory();
        resolveStacking(obj, fCanvas);

        const bgWidth = fCanvas.backgroundImage?.width * fCanvas.backgroundImage?.scaleX || 1;
        const bgHeight = fCanvas.backgroundImage?.height * fCanvas.backgroundImage?.scaleY || 1;
        const bgLeft = fCanvas.backgroundImage?.left || 0;
        const bgTop = fCanvas.backgroundImage?.top || 0;

        fCanvas.getObjects().forEach((canvasObj: any) => {
          if (canvasObj.data?.id) {
            const relX = ((canvasObj.left - bgLeft) / bgWidth) * 100;
            const relY = ((canvasObj.top - bgTop) / bgHeight) * 100;
            const newWidth = canvasObj.width * canvasObj.scaleX;

            canvasObj.set({ width: newWidth, scaleX: 1, scaleY: 1 });
            callbacks.current.onUpdateText(canvasObj.data.id, { 
              x: relX, 
              y: relY,
              width: newWidth
            });
          }
        });
      }
    };

    fCanvas.on('object:modified', handleModified);

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  const syncCanvasSize = useCallback(() => {
    if (!containerRef.current || !fabricCanvasRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const fCanvas = fabricCanvasRef.current;

    fabric.Image.fromURL(page.imageUrl, (img: any) => {
      if (!fabricCanvasRef.current || !img) return;
      const imgRatio = img.width / img.height;
      const containerRatio = width / height;
      let finalWidth, finalHeight;

      if (imgRatio > containerRatio) {
        finalWidth = width;
        finalHeight = width / imgRatio;
      } else {
        finalHeight = height;
        finalWidth = height * imgRatio;
      }

      fCanvas.setDimensions({ width: finalWidth, height: finalHeight });
      img.set({
        scaleX: finalWidth / img.width,
        scaleY: finalHeight / img.height,
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });

      fCanvas.setBackgroundImage(img, () => {
        fCanvas.renderAll();
        setContainerSize({ width: finalWidth, height: finalHeight });
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
    const textIds = page.textObjects.map(t => t.id);
    const bubbleIds = (page.bubbles || []).map(b => b.id);
    const allIds = [...textIds, ...bubbleIds];

    // 1. Remove stale objects
    currentObjects.forEach((obj: any) => {
      if (obj.data?.id && !allIds.includes(obj.data.id)) {
        fCanvas.remove(obj);
      }
    });

    // 2. Add or Update Bubbles
    (page.bubbles || []).forEach((bubble) => {
      let fabricBubble = fCanvas.getObjects().find((o: any) => o.data?.id === bubble.id);
      const bubbleProps = {
        left: (bubble.x / 100) * containerSize.width,
        top: (bubble.y / 100) * containerSize.height,
        width: bubble.width,
        height: bubble.height,
        fill: bubble.backgroundColor,
        stroke: bubble.borderColor,
        strokeWidth: bubble.borderWidth,
        rx: bubble.style === 'square' ? 5 : 50,
        ry: bubble.style === 'square' ? 5 : 50,
      };

      if (!fabricBubble) {
        fabricBubble = new fabric.Rect({
          ...bubbleProps,
          data: { id: bubble.id, type: 'bubble' }
        });
        fCanvas.add(fabricBubble);
        fabricBubble.sendToBack();
      } else {
        fabricBubble.set(bubbleProps);
      }
    });

    // 3. Add or Update Text objects
    page.textObjects.forEach((obj) => {
      const displayContent = cleanText(obj.originalText, hideLabels);
      let fabricObj = fCanvas.getObjects().find((o: any) => o.data?.id === obj.id);

      const props = {
        left: (obj.x / 100) * containerSize.width,
        top: (obj.y / 100) * containerSize.height,
        width: obj.width,
        fontSize: obj.fontSize,
        fill: obj.color,
        textAlign: obj.alignment,
        stroke: obj.outlineColor,
        strokeWidth: obj.outlineWidth,
        strokeUniform: true,
        paintFirst: 'stroke',
        fontFamily: obj.fontFamily || 'Inter',
        text: displayContent,
        shadow: new fabric.Shadow({
          color: obj.glowColor,
          blur: obj.glowBlur,
          opacity: obj.glowOpacity,
          nonScaling: true
        })
      };

      if (!fabricObj) {
        fabricObj = new fabric.Textbox(displayContent, {
          ...props,
          data: { id: obj.id },
          lockScalingY: true,
        });
        fCanvas.add(fabricObj);
      } else {
        fabricObj.set(props);
      }
    });

    const target = fCanvas.getObjects().find((o: any) => o.data?.id === selectedTextId);
    if (target && fCanvas.getActiveObject() !== target) {
      fCanvas.setActiveObject(target);
    } else if (!target) {
      fCanvas.discardActiveObject();
    }

    fCanvas.renderAll();
    setTimeout(() => { isRenderingRef.current = false; }, 50);

  }, [page.textObjects, page.bubbles, containerSize, hideLabels, selectedTextId]);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 min-h-[400px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Editor;