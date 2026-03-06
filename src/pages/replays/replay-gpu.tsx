'use client';

import { useEffect, useRef, useState } from 'react';
import { Renderer } from '../../webgpu/renderer';
import { ReplayPlayer } from '../../webgpu/replayPlayer';
import type { ReplayJSON } from '../../webgpu/types';

export default function ReplayPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rendererRef = useRef<Renderer | null>(null);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const isPlayingRef = useRef(true);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const renderer = await Renderer.create(canvas);
      if (cancelled) return;
      rendererRef.current = renderer;

      const res = await fetch('/003802019139782967518_1486376156.dem.json', {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to load replay: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as ReplayJSON;
      if (cancelled) return;

      const player = new ReplayPlayer();
      player.setReplay(data);
      playerRef.current = player;

      const duration = player.getDurationSeconds();
      setDurationSec(duration);
      setCurrentTimeSec(0);

      const firstFrame = player.seekToElapsedSeconds(0);
      if (firstFrame && rendererRef.current) {
        rendererRef.current.render(firstFrame, 0);
      }

      const loop = (nowMs: number) => {
        if (cancelled) return;

        const renderer = rendererRef.current;
        const player = playerRef.current;
        if (!renderer || !player) return;

        if (lastTimeRef.current === null) {
          lastTimeRef.current = nowMs;
        }

        const dtSec = (nowMs - lastTimeRef.current) / 1000;
        lastTimeRef.current = nowMs;

        let frame = null;

        if (isPlayingRef.current) {
          frame = player.advance(dtSec);
          setCurrentTimeSec(player.getCurrentElapsedSeconds());
        } else {
          frame = player.getFrameAtElapsedSeconds(player.getCurrentElapsedSeconds());
        }

        if (frame) {
          renderer.render(frame, player.getCurrentElapsedSeconds());
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    })().catch((err) => {
      console.error(err);
    });

    return () => {
      cancelled = true;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rendererRef.current = null;
      playerRef.current = null;
      lastTimeRef.current = null;
    };
  }, []);

  const handleSeek = (sec: number) => {
    const player = playerRef.current;
    const renderer = rendererRef.current;
    if (!player || !renderer) return;

    const frame = player.seekToElapsedSeconds(sec);
    setCurrentTimeSec(sec);

    if (frame) {
      renderer.render(frame, sec);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-900">
      <div
        style={{ width: 1280, height: 720 }}
        className="border border-slate-700 rounded-xl overflow-hidden"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setIsPlaying((p) => !p)}
          className="px-4 py-2 rounded bg-slate-700 text-white"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <input
          type="range"
          min={0}
          max={durationSec}
          step={0.01}
          value={currentTimeSec}
          onMouseDown={() => setIsPlaying(false)}
          onChange={(e) => {
            const sec = Number(e.target.value);
            handleSeek(sec);
          }}
          style={{ width: 500 }}
        />

        <span className="text-white">
          {formatTime(currentTimeSec)} / {formatTime(durationSec)}
        </span>
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}