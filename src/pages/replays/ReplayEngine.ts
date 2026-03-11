import { useCallback, useEffect, useRef, useState } from "react";
import { AudioSyncPlayer } from "../../utils/media/AudioSyncPlayer";
import { Renderer } from "../../utils/webgpu/renderer";
import { ReplayPlayer } from "../../utils/webgpu/replayPlayer";
import type { ReplayJSON } from "../../utils/webgpu/types";

export function useReplayEngine(
  id: string | undefined,
  canvasRef: React.RefObject<HTMLCanvasElement | null>, // can be null if unsupported browser or not yet mounted
  audioPlayerRef: React.RefObject<AudioSyncPlayer | null>, // can be null if not yet initialized
) {
  const rendererRef = useRef<Renderer | null>(null);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [replayStartTick, setReplayStartTick] = useState(0);
  const [roundStartTicks, setRoundStartTicks] = useState<number[]>([]);
  const [ticksPerSecond, setTicksPerSecond] = useState(64);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sync state to refs for the RAF loop & handle Audio transport
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.play(currentTimeSec);
      } else {
        audioPlayerRef.current.stop();
      }
    }
  }, [isPlaying]);

  // Main WebGPU Initialization
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!id || !canvasRef.current) return setFetchError("No replay ID or canvas.");
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/replays/${id}/json`, { credentials: "include" });
        if (!res.ok) throw new Error(`Server Error ${res.status}`);

        const renderer = await Renderer.create(canvasRef.current);
        if (cancelled) return;
        rendererRef.current = renderer;

        const data: ReplayJSON = JSON.parse(await res.text());
        const player = new ReplayPlayer();
        player.setReplay(data);
        playerRef.current = player;

        // setup initial state based on replay metadata
        setTicksPerSecond(player.ticksPerSecond);
        setReplayStartTick(data.timeline[0]?.tick ?? 0);
        setRoundStartTicks(
          (data.events?.round_start ?? []).map(r => r.tick).filter(Number.isFinite).sort((a, b) => a - b),
        );
        setDurationSec(player.getDurationSeconds());
        setCurrentTimeSec(0);

        const firstFrame = player.seekToElapsedSeconds(0);
        if (firstFrame) renderer.render(firstFrame, 0);
        setIsFetching(false);

        // main loop to advance replay frames and sync audio
        const loop = (nowMs: number) => {
          if (cancelled || !rendererRef.current || !playerRef.current) return;
          if (lastTimeRef.current === null) lastTimeRef.current = nowMs;

          const dtSec = (nowMs - lastTimeRef.current) / 1000;
          lastTimeRef.current = nowMs;

          let frame = null;
          if (isPlayingRef.current) {
            frame = playerRef.current.advance(dtSec);
            setCurrentTimeSec(playerRef.current.getCurrentElapsedSeconds());
          } else {
            frame = playerRef.current.getFrameAtElapsedSeconds(playerRef.current.getCurrentElapsedSeconds());
          }

          if (frame) rendererRef.current.render(frame, playerRef.current.getCurrentElapsedSeconds());
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err: any) {
        if (!cancelled) {
          setFetchError(err.message || "Failed to load replay.");
          setIsFetching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [id, canvasRef]);

  const handleSeek = useCallback((sec: number) => {
    if (!playerRef.current || !rendererRef.current) return;
    const frame = playerRef.current.seekToElapsedSeconds(sec);
    setCurrentTimeSec(sec);
    if (frame) rendererRef.current.render(frame, sec);
    if (isPlayingRef.current && audioPlayerRef.current) audioPlayerRef.current.play(sec);
  }, [canvasRef, audioPlayerRef]);

  return {
    isPlaying,
    setIsPlaying,
    currentTimeSec,
    durationSec,
    replayStartTick,
    roundStartTicks,
    ticksPerSecond,
    isFetching,
    fetchError,
    handleSeek,
  };
}
