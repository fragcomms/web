// src/app/replay/page.tsx (Next.js example)
'use client';
import { useEffect, useRef } from 'react';
import { ReplayRenderer } from '../../webgpu/renderer';
import type { Frame } from '../../webgpu/types';

export default function ReplayPage() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);  

  useEffect(() => {
    let renderer: ReplayRenderer | null = null;

    (async () => {
      if (!canvasRef.current) return;
      renderer = await ReplayRenderer.create(canvasRef.current);

      // TODO: replace with real frames from backend
      const demoFrames: Frame[] = [
        {
          time: 0,
          players: [
            { id: 1, x: 100, y: 100, alive: true, team: 0 },
            { id: 2, x: 200, y: 300, alive: true, team: 1 },
          ],
        },
        {
          time: 3,
          players: [
            { id: 1, x: 400, y: 300, alive: true, team: 0 },
            { id: 2, x: 900, y: 1000, alive: false, team: 1 },
          ],
        },
      ];

      renderer.setFrames(demoFrames);
      renderer.play();
    })();

    return () => {
      renderer?.pause();
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="border border-slate-700 rounded-xl"
      />
    </div>
  );
}
