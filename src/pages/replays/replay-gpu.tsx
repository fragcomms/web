// src/app/replay/page.tsx (Next.js example)
'use client';
import { useEffect, useRef } from 'react';
import { ReplayRenderer } from '../../webgpu/renderer';
import type { ReplayJSON } from '../../webgpu/types';

export default function ReplayPage() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);  

  useEffect(() => {
    let renderer: ReplayRenderer | null = null;
    let cancelled = false;

    (async () => {
      if (!canvasRef.current) return;
      renderer = await ReplayRenderer.create(canvasRef.current);

      const res = await fetch('/replay.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load replay: ${res.status} ${res.statusText}`);

      const data = await res.json() as ReplayJSON;

      if(cancelled) return;

      renderer.setReplay(data);
      renderer.play();
    })().catch((err) => {
      console.error(err);
    });

    return () => {
      cancelled = true;
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