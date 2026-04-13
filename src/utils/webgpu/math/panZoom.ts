import React, { useCallback, useRef, useState } from "react";

export interface PanZoomConfig {
  minZoom?: number;
  maxZoom?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

/** * Mathematical clamping ensures values stay within a specific range.
 * Often used in game engines and UI physics to prevent "infinite drifting."
 */
const clamp = (value: number, min: number, max: number) => 
  Math.max(min, Math.min(max, value));

export function usePanZoom(config: PanZoomConfig = {}) {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  
  const isDragging = useRef(false);

  const minZoom = Math.max(0.1, config.minZoom ?? 0.5); 
  const maxZoom = config.maxZoom ?? 5.0;

  const minX = config.minX ?? -2000;
  const maxX = config.maxX ?? 2000;
  const minY = config.minY ?? -2000;
  const maxY = config.maxY ?? 2000;

  const panSensitivity = 10;

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;

    setCamera((prev) => {
      // dividing movement by zoom ensures that panning feels consistent 
      // regardless of how far zoomed in or out the user is.
      const dx = (e.movementX * panSensitivity) / prev.zoom;
      const dy = (e.movementY * panSensitivity) / prev.zoom;

      const newX = clamp(prev.x - dx, minX, maxX);
      const newY = clamp(prev.y + dy, minY, maxY);

      return { ...prev, x: newX, y: newY };
    });
  }, [panSensitivity, minX, maxX, minY, maxY]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    // 1.1 is a common "golden ratio" for smooth scrolling; 
    // it provides a 10% change per notch.
    const zoomFactor = 1.1; 

    setCamera((prev) => {
      const rawZoom = e.deltaY < 0 ? prev.zoom * zoomFactor : prev.zoom / zoomFactor;
      const newZoom = clamp(rawZoom, minZoom, maxZoom);

      return {
        ...prev,
        x: clamp(prev.x, minX, maxX),
        y: clamp(prev.y, minY, maxY),
        zoom: newZoom,
      };
    });
  }, [minZoom, maxZoom, minX, maxX, minY, maxY]);

  return { camera, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel };
}