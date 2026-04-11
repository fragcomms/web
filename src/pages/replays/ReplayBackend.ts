import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioSyncPlayer } from "../../utils/media/AudioSyncPlayer";
import { Renderer } from "../../utils/webgpu/core/renderer";
import { ReplayEngine } from "../../utils/webgpu/logic/engine/replayEngine";
import { DefaultMapConfig, MapRegistry } from "../../utils/webgpu/logic/mapConfig";
import { usePanZoom } from "../../utils/webgpu/math/panZoom";
import type { PlayerDeathEvent } from "../../utils/webgpu/types";
import type { RenderFrame, ReplayJSON, ReplayMeta, RoundEndEvent } from "../../utils/webgpu/types";

type ReplayAudioSyncConfig = {
  audioStartOffsetSec: number;
  audioDurationSec: number | null;
  audioSyncDisabled: boolean;
};

export function useReplayEngine(
  id: string | undefined,
  canvasRef: React.RefObject<HTMLCanvasElement | null>, // can be null if unsupported browser or not yet mounted
  audioPlayerRef: React.RefObject<AudioSyncPlayer | null>, // can be null if not yet initialized
  audioSyncConfig: ReplayAudioSyncConfig,
) {
  const rendererRef = useRef<Renderer | null>(null);
  const playerRef = useRef<ReplayEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const lastRenderedTickRef = useRef<number>(-1);
  const isScrubbingRef = useRef(false);
  const isSecondHalfRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [replayStartTick, setReplayStartTick] = useState(0);
  const [roundStartTicks, setRoundStartTicks] = useState<number[]>([]);
  const [ticksPerSecond, setTicksPerSecond] = useState(64);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [frame, setFrame] = useState<RenderFrame | null>(null); // catch each frame for hp
  const [replayMeta, setReplayMeta] = useState<ReplayMeta | null>(null); // to check final score
  const [roundEndEvents, setRoundEndEvents] = useState<RoundEndEvent[]>([]); // calculate live score based on end round events
  const [isRendererReady, setIsRendererReady] = useState(false);
  const { camera, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel } = usePanZoom();
  const cameraRef = useRef(camera);
  const [deathEvents, setDeathEvents] = useState<PlayerDeathEvent[]>([]); // for KDA and other stats
  const [slotToSteamid, setSlotToSteamid] = useState<Record<number, string>>({});
  

  const effectiveDurationSec = useMemo(() => {
    if (audioSyncConfig.audioSyncDisabled || audioSyncConfig.audioDurationSec === null) {
      return durationSec;
    }

    const audioEndSec = audioSyncConfig.audioStartOffsetSec + audioSyncConfig.audioDurationSec;
    return Math.max(0, Math.min(durationSec, audioEndSec));
  }, [audioSyncConfig, durationSec]);

  const effectiveDurationSecRef = useRef(effectiveDurationSec);
  useEffect(() => {
    effectiveDurationSecRef.current = effectiveDurationSec;
  }, [effectiveDurationSec]);

  const syncAudioForReplayTime = useCallback((replaySec: number) => {
    if (!audioPlayerRef.current) return;

    if (audioSyncConfig.audioSyncDisabled) {
      audioPlayerRef.current.stop();
      return;
    }

    const audioSeekSec = replaySec - audioSyncConfig.audioStartOffsetSec;
    if (audioSeekSec < 0) {
      audioPlayerRef.current.stop();
      return;
    }

    if (audioSyncConfig.audioDurationSec !== null && audioSeekSec >= audioSyncConfig.audioDurationSec) {
      audioPlayerRef.current.stop();
      return;
    }

    audioPlayerRef.current.play(audioSeekSec);
  }, [audioPlayerRef, audioSyncConfig]);

  // compute live score
  const { scoreCT, scoreT } = useMemo(() => {
    if (!roundEndEvents) return { score_ct: 0, score_t: 0 };
    // start at 0-0
    let ct = 0; //
    let t = 0; //
    let round = 1; // starts at first round

    // increment score based on round end winner @ current tick
    for (const event of roundEndEvents) {
      const eventSec = (event.t - replayStartTick) / ticksPerSecond;
      const isFirstHalf = round <= 12; // team swap indicator (halftime)
      if (eventSec <= currentTimeSec) {
        if (event.winner === "CT") {
          isFirstHalf ? ct++ : t++; // since the sides swap, the oringinal ct team becomes t and gets the points when they win
          // console.log("round " + round + " ended, winner: " + event.winner + ", score is now CT " + ct + " - T " + t);
          round++;
        }
        if (event.winner === "T") {
          isFirstHalf ? t++ : ct++; // same logic as ct  winner, but flipped
          // console.log("round " + round + " ended, winner: " + event.winner + ", score is now CT " + ct + " - T " + t);
          round++;
        }
      } else {
        break;
      }
    }
    return { scoreCT: ct, scoreT: t };
  }, [roundEndEvents, currentTimeSec, replayStartTick, ticksPerSecond]);






  // Sync state to refs for the RAF loop & handle Audio transport
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (audioPlayerRef.current) {
      if (isPlaying) {
        syncAudioForReplayTime(currentTimeRef.current);
      } else {
        audioPlayerRef.current.stop();
      }
    }
  }, [isPlaying, audioPlayerRef, syncAudioForReplayTime]);

  useEffect(() => {
    currentTimeRef.current = currentTimeSec;
  }, [currentTimeSec]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  // webgpu initialization
  useEffect(() => {
    let cancelled = false;
    if (!canvasRef.current) return;

    (async () => {
      try {
        const renderer = await Renderer.create(canvasRef.current!);
        if (cancelled) return;

        rendererRef.current = renderer;
        setIsRendererReady(true);
        console.log("WebGPU initialized");
      } catch (err: any) {
        if (!cancelled) setFetchError("Failed to initialize WebGPU: " + err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canvasRef]);

  // data fetch and loop initialization
  useEffect(() => {
    let cancelled = false;

    if (!id || !isRendererReady || !rendererRef.current) return;

    (async () => {
      setIsFetching(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/replays/${id}/json`, { credentials: "include" });
        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const data: ReplayJSON = await res.json();
        console.log("raw timeline tick keys:", Object.keys(data.timeline[0]));
        console.log("raw timeline tick:", data.timeline[0]);
        if (cancelled) return;

        // loading the map
        if (data.meta?.map) {
          try {
            const mapOutlineRes = await fetch(`/maps/${data.meta.map}.geometry.json`);
            if (mapOutlineRes.ok) {
              const geometryJSON = await mapOutlineRes.json();

              rendererRef.current?.setMapGeometry(geometryJSON, data.meta.map);

              const config = MapRegistry[data.meta.map] || DefaultMapConfig;
              const mapUrl = `/maps/${data.meta.map}.radar.svg`;

              await rendererRef.current?.getMapRenderer().loadMapImage(mapUrl, config, geometryJSON.bounds);
            } else {
              console.warn(`No map geometry found for ${data.meta.map}`);
            }
          } catch (err) {
            console.warn(`Failed to load map geometry or image: `, err);
          }
        }

        const player = new ReplayEngine();
        player.setReplay(data);
        playerRef.current = player;

        if (data.meta) setReplayMeta(data.meta);
        if (data.events?.round_end) setRoundEndEvents(data.events.round_end);
        
        if (data.events?.player_death) {
          const sorted = [...data.events.player_death].sort((a, b) => a.t - b.t);

          setDeathEvents(sorted);
        }

        setTicksPerSecond(player.ticksPerSecond);
        setReplayStartTick(data.timeline[0]?.t ?? 0);
        setRoundStartTicks(
          (data.events?.round_start ?? []).map(r => r.t).filter(Number.isFinite).sort((a, b) => a - b),
        );
        setDurationSec(player.getDurationSeconds());
        setCurrentTimeSec(0);

        const firstFrame = player.seekToElapsedSeconds(0);
          if (firstFrame) {
            const map: Record<number, string> = {};
            
            // p[i][0] is the actual slot number, indexes were a bit messed up with the sorting
            (data.timeline[0] as any).p.forEach((rawPlayer: number[], arrayIndex: number) => {
              const slot = rawPlayer[0];
              const steamid = firstFrame.players[arrayIndex].steamid;
              map[slot] = steamid;
            });
            
            setSlotToSteamid(map);
            rendererRef.current?.render(firstFrame, 0);
            setFrame(firstFrame);
          }

        setIsFetching(false);

        // getting the loop
        const loop = (nowMs: number) => {
          if (cancelled || !rendererRef.current || !playerRef.current) return;

          const currentCamera = cameraRef.current;
          rendererRef.current.updateCamera(currentCamera.x, currentCamera.y, currentCamera.zoom);

          if (lastTimeRef.current === null) lastTimeRef.current = nowMs;

          const dtSec = (nowMs - lastTimeRef.current) / 1000;
          lastTimeRef.current = nowMs;

          if (isScrubbingRef.current) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          let frame = null;
          const currentEffectiveDuration = effectiveDurationSecRef.current;

          if (isPlayingRef.current) {
            frame = playerRef.current.advance(dtSec);
            const nextSec = Math.min(playerRef.current.getCurrentElapsedSeconds(), currentEffectiveDuration);

            if (nextSec >= currentEffectiveDuration) {
              playerRef.current.seekToElapsedSeconds(currentEffectiveDuration);
              setCurrentTimeSec(currentEffectiveDuration);
              setIsPlaying(false);
            } else {
              setCurrentTimeSec(nextSec);
            }
          } else {
            frame = playerRef.current.getFrameAtElapsedSeconds(playerRef.current.getCurrentElapsedSeconds());
          }

          if (frame) {
            rendererRef.current.render(frame, playerRef.current.getCurrentElapsedSeconds(), {
              isSecondHalf: isSecondHalfRef.current,
            });
            if (frame.tick !== lastRenderedTickRef.current) {


              setFrame(frame);
              lastRenderedTickRef.current = frame.tick;
            }
          }
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
  }, [id, isRendererReady]);

  const handleSeek = useCallback((sec: number) => {
    if (!playerRef.current || !rendererRef.current) return;

    const clampedSec = Math.max(0, Math.min(sec, effectiveDurationSec));
    setCurrentTimeSec(clampedSec);

    const frame = playerRef.current.seekToElapsedSeconds(clampedSec);

    requestAnimationFrame(() => {
      if (!rendererRef.current || !frame) return;

      rendererRef.current.render(frame, clampedSec, {
        isSecondHalf: isSecondHalfRef.current,
      });
      setFrame(frame);
      lastRenderedTickRef.current = frame.tick;


      if (isPlayingRef.current) {
        syncAudioForReplayTime(clampedSec);
      }
    });
  }, [effectiveDurationSec, syncAudioForReplayTime]);

  const handlePreviewSeek = useCallback((sec: number) => {
    if (!playerRef.current || !rendererRef.current) return;
    const clampedSec = Math.max(0, Math.min(sec, effectiveDurationSec));
    setCurrentTimeSec(clampedSec);

    requestAnimationFrame(() => {
      if (!playerRef.current || !rendererRef.current) return;
      const frame = playerRef.current.seekToElapsedSeconds(clampedSec);
      if (frame) {
        rendererRef.current.render(frame, clampedSec, {
          isSecondHalf: isSecondHalfRef.current,
          skipFluidSim: false,
          skipDeathShardEffects: false,
          
        });
        setFrame(frame);
        lastRenderedTickRef.current = frame.tick;
      }
    });
  }, [effectiveDurationSec]);

  return {
    frame,
    isPlaying,
    setIsPlaying,
    setIsScrubbing: (val: boolean) => { isScrubbingRef.current = val; },
    setIsSecondHalf: (val: boolean) => { isSecondHalfRef.current = val; },
    currentTimeSec,
    durationSec: effectiveDurationSec,
    replayStartTick,
    roundStartTicks,
    ticksPerSecond,
    isFetching,
    fetchError,
    handleSeek,
    handlePreviewSeek,
    scoreCT,
    scoreT,
    replayMeta,
    deathEvents,
    slotToSteamid,
    
    canvasHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onWheel: handleWheel,
    },
  };
}
