import React, { useState, useCallback, useRef } from 'react';

export function usePanZoom() {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);

  // This multiplier matches mouse pixels to your WebGPU coordinate space (base half = 4000)
  // You may need to tweak this number (e.g., 5, 10, 20) until the drag feels exactly 1:1 with the cursor
  const panSensitivity = 10; 

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;

    setCamera((prev) => {
      // DOM coordinates: +X is Right, +Y is Down
      // WebGPU coordinates: +X is Right, +Y is Up
      // Therefore, we subtract movementX, but ADD movementY
      const dx = (e.movementX * panSensitivity) / prev.zoom;
      const dy = (e.movementY * panSensitivity) / prev.zoom;

      return {
        ...prev,
        x: prev.x - dx,
        y: prev.y + dy,
      };
    });
  }, [panSensitivity]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    // Prevent the whole browser page from scrolling
    e.preventDefault(); 

    const zoomFactor = 1.1; // 10% zoom per scroll tick

    setCamera((prev) => ({
      ...prev,
      // Scroll Up (deltaY < 0) = Zoom In, Scroll Down = Zoom Out
      zoom: e.deltaY < 0 ? prev.zoom * zoomFactor : prev.zoom / zoomFactor,
    }));
  }, []);

  return { camera, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel };
}