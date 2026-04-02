import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { AudioSyncPlayer } from "../../utils/media/AudioSyncPlayer";
import { Renderer } from "../../utils/webgpu/renderer";
import { ReplayPlayer } from "../../utils/webgpu/replayPlayer";
import type { ReplayJSON, RenderFrame, RoundEndEvent, ReplayMeta } from "../../utils/webgpu/types";

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
  const [frame, setFrame] = useState<RenderFrame | null>(null); // catch each frame for hp
  const [replayMeta, setReplayMeta] = useState<ReplayMeta | null>(null); // to check final score
  const [roundEndEvents, setRoundEndEvents] = useState<RoundEndEvent[]>([]); // calculate live score based on end round events

  // compute live score
  const { scoreCT, scoreT } = useMemo(() => {

    if(!roundEndEvents) return {score_ct: 0, score_t: 0};
    // start at 0-0
    let ct = 0;   //
    let t = 0;    //
    let round = 1; // starts at first round 
    

    // increment score based on round end winner @ current tick
    for (const event of roundEndEvents) {
      const eventSec = (event.t - replayStartTick) / ticksPerSecond;
      const isFirstHalf = round <= 12; // team swap indicator (halftime)
      if(eventSec <= currentTimeSec) {
        if (event.winner === "CT") {
          isFirstHalf ? ct++ : t++; //since the sides swap, the oringinal ct team becomes t and gets the points when they win
          //console.log("round " + round + " ended, winner: " + event.winner + ", score is now CT " + ct + " - T " + t); 
          round++;
        }
        if (event.winner === "T") {
          isFirstHalf ? t++ : ct++; // same logic as ct  winner, but flipped
          //console.log("round " + round + " ended, winner: " + event.winner + ", score is now CT " + ct + " - T " + t); 
          round++;
        }
      } else {
        break;
      }
    }
    return {scoreCT: ct, scoreT: t};
  }, [roundEndEvents, currentTimeSec, replayStartTick, ticksPerSecond]);

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

        //map loading
         if (data.meta?.map) {
          try {
            const mapRes = await fetch(`/maps/${data.meta.map}.geometry.json`);
            if (mapRes.ok) {
              renderer.setMapGeometry(await mapRes.json());
            } else {
              console.warn(`No map geometry found for ${data.meta.map}`);
            }
          } catch (err) {
            console.warn("Failed to load map geometry:", err);
          }
        }       

        const player = new ReplayPlayer();
        player.setReplay(data);
        playerRef.current = player;

        // match metadata
        if (data.meta) setReplayMeta(data.meta);

        // round end events
        if (data.events?.round_end) {
          setRoundEndEvents(data.events.round_end);
        }


        // setup initial state based on replay metadata
        setTicksPerSecond(player.ticksPerSecond);
        setReplayStartTick(data.timeline[0]?.t ?? 0);
        setRoundStartTicks(
          (data.events?.round_start ?? []).map(r => r.t).filter(Number.isFinite).sort((a, b) => a - b),
        );
        setDurationSec(player.getDurationSeconds());
        setCurrentTimeSec(0);

        const firstFrame = player.seekToElapsedSeconds(0);
        if (firstFrame) {
          renderer.render(firstFrame, 0);
          setFrame(firstFrame);
        }
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

          if (frame)  {
            rendererRef.current.render(frame, playerRef.current.getCurrentElapsedSeconds());
            setFrame(frame);
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
  }, [id, canvasRef]);

  const handleSeek = useCallback((sec: number) => {
    if (!playerRef.current || !rendererRef.current) return;
    const frame = playerRef.current.seekToElapsedSeconds(sec);
    setCurrentTimeSec(sec);
    if (frame) {
      rendererRef.current.render(frame, sec);
      setFrame(frame);
    }
    if (isPlayingRef.current && audioPlayerRef.current) audioPlayerRef.current.play(sec);
  }, [canvasRef, audioPlayerRef]);

  return {
    frame,
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
    scoreCT,
    scoreT,
    replayMeta,
    
  };
}
