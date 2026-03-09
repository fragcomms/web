"use client";

import { ArrowLeftRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Renderer } from "../../webgpu/renderer";
import { ReplayPlayer } from "../../webgpu/replayPlayer";
import type { ReplayJSON } from "../../webgpu/types";

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  // Canvas target where WebGPU renders each replay frame.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Long-lived runtime objects kept outside React render cycles.
  const rendererRef = useRef<Renderer | null>(null);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Mirror of play state used by requestAnimationFrame to avoid stale closures.
  const isPlayingRef = useRef(true);

  // UI state for transport controls.
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [replayStartTick, setReplayStartTick] = useState(0);
  const [roundStartTicks, setRoundStartTicks] = useState<number[]>([]);
  const [ticksPerSecond, setTicksPerSecond] = useState(64);

  // adding fetch/error states so we know when it is fetching and when
  // the fetch errored out
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Keep imperative ref synchronized with React state.
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    // Guard to stop async/RAF work after unmount.
    let cancelled = false;

    (async () => {
      if (!id) {
        setFetchError("No replay ID provided in the URL.");
        setIsFetching(false);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const targetUrl = `${import.meta.env.VITE_API_URL}/replays/${id}/json`;

        const res = await fetch(targetUrl, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Server Error ${res.status}: ${res.statusText}`);
        }

        // Initialize WebGPU renderer once.
        const renderer = await Renderer.create(canvas);
        if (cancelled) return;
        rendererRef.current = renderer;

        // Load replay JSON and seed the player timeline.
        const data: ReplayJSON = JSON.parse(await res.text());
        const player = new ReplayPlayer();
        player.setReplay(data);
        playerRef.current = player;
        setTicksPerSecond(player.ticksPerSecond);

        const firstTimelineTick = data.timeline[0]?.tick ?? 0;
        setReplayStartTick(firstTimelineTick);

        const starts = (data.events?.round_start ?? [])
          .map((round) => round.tick)
          .filter((tick) => Number.isFinite(tick))
          .sort((a, b) => a - b);
        setRoundStartTicks(starts);

        const duration = player.getDurationSeconds();
        setDurationSec(duration);
        setCurrentTimeSec(0);

        const firstFrame = player.seekToElapsedSeconds(0);
        if (firstFrame && rendererRef.current) {
          rendererRef.current.render(firstFrame, 0);
        }

        setIsFetching(false);

        // Main playback loop: compute delta time, advance/seek frame, then render.
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
            // Advance timeline in real-time while playing.
            frame = player.advance(dtSec);
            setCurrentTimeSec(player.getCurrentElapsedSeconds());
          } else {
            // While paused, render the current timeline position.
            frame = player.getFrameAtElapsedSeconds(player.getCurrentElapsedSeconds());
          }

          if (frame) {
            renderer.render(frame, player.getCurrentElapsedSeconds());
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setFetchError(err.message || "An unknown error occurred while loading the replay.");
          setIsFetching(false);
        }
      }
    })();

    return () => {
      // Cleanup animation and runtime refs on unmount.
      cancelled = true;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rendererRef.current = null;
      playerRef.current = null;
      lastTimeRef.current = null;
    };
  }, [id]);

  // Random-access seek: jump timeline and immediately redraw target frame.
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

  const handleRoundSelect = (roundIndex: number) => {
    const roundStartTick = roundStartTicks[roundIndex];
    const seekSec = Math.max(0, (roundStartTick - replayStartTick) / ticksPerSecond);

    setIsPlaying(true);
    handleSeek(seekSec);
  };

  const activeRound = roundStartTicks.length > 0
    ? getRoundFromTick(
      roundStartTicks,
      replayStartTick + currentTimeSec * ticksPerSecond,
    )
    : 1;

  if (fetchError) {
    return (
      <div className="w-full flex-1 flex items-center justify-center text-red-400 p-8">
        <p className="text-xl font-semibold">Error: {fetchError}</p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full max-w-[720px] aspect-square border border-slate-700 rounded-xl overflow-hidden self-start shrink-0">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      <div className="w-full flex flex-col items-center gap-3 self-center">
        <div className="flex items-center gap-3 w-full max-w-[800px]">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="min-w-[80px] px-4 py-2 rounded bg-slate-700 text-white"
            disabled={isFetching}
          >
            {isPlaying ? "Pause" : "Play"}
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
            className="flex-1 cursor-pointer"
            disabled={isFetching}
          />

          <span className="text-white">
            {formatTime(currentTimeSec)} / {formatTime(durationSec)}
          </span>
        </div>

        <div className="flex flex-wrap self-center justify-center gap-1.5 max-w-[600px]">
          {roundStartTicks.map((_, index) => {
            const roundNumber = index + 1;
            const isCurrent = roundNumber === activeRound;

            return (
              <div key={roundNumber} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRoundSelect(index)}
                  className={`h-7 w-7 rounded-full border text-xs font-semibold flex items-center justify-center transition-colors ${isCurrent
                    ? "bg-blue-500 border-blue-400 text-white"
                    : "bg-slate-900 border-slate-600 text-slate-200 hover:border-slate-400 hover:text-white"
                    }`}
                  title={`Jump to round ${roundNumber}`}
                  disabled={isFetching}
                >
                  {roundNumber}
                </button>

                {roundNumber === 12 && roundStartTicks.length > 12 && (
                  <div
                    className="flex h-7 w-7 items-center justify-center text-slate-300"
                    title="Side switch"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getRoundFromTick(roundStartTicks: number[], currentTick: number): number {
  if (roundStartTicks.length === 0) return 1;

  let round = 1;
  for (let i = 0; i < roundStartTicks.length; i += 1) {
    if (currentTick >= roundStartTicks[i]) {
      round = i + 1;
      continue;
    }
    break;
  }

  return round;
}

function formatTime(sec: number): string {
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
