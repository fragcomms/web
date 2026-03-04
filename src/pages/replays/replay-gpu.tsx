// src/app/replay/page.tsx (Next.js example)
'use client';
import { useEffect, useRef } from 'react';
import { Renderer } from '../../webgpu/renderer';
import { ReplayPlayer } from '../../webgpu/replayPlayer';
import type { ReplayJSON } from '../../webgpu/types';

export default function ReplayPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);  

  const rendererRef = useRef<Renderer | null>(null);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      //renderer init
      const renderer = await Renderer.create(canvas);
      if (cancelled) return;
      rendererRef.current = renderer;

      //JSON replay import
      const res = await fetch('/003802019139782967518_1486376156.dem.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load replay: ${res.status} ${res.statusText}`);
      const data = await res.json() as ReplayJSON;
      if(cancelled) return;

      // Replay player init
      const player = new ReplayPlayer();
      player.setReplay(data);
      playerRef.current = player;

      // RAF loop
      const t0 = performance.now();

      const loop = () => {
        if (cancelled) return;

        const renderer = rendererRef.current;
        const player = playerRef.current;
        if (!renderer || !player) return;

        const elapsedSec = (performance.now() - t0) / 1000;
        const frame = player.getFrameAtElapsedSeconds(elapsedSec);
        if (frame) renderer.render(frame);

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);

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
      <div
        style={{ width: 1280, height: 720}}
        className="border border-slate-700 rounded-xl"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

      </div>
    </div>
  );
}