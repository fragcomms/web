"use client";

import { ArrowLeftRight, Clock3, Mic, MicOff, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Renderer } from "../../webgpu/renderer";
import { ReplayPlayer } from "../../webgpu/replayPlayer";
import type { ReplayJSON } from "../../webgpu/types";

interface TranscriptSegment {
  discordId: string;
  start: number;
  end: number;
  text: string;
}

export default function ReplayPage() {
  const { id } = useParams<{ id: string; }>();
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
  const [transcriptText, setTranscriptText] = useState("Loading transcript...");
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);

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

  useEffect(() => {
    let cancelled = false;

    async function fetchTranscript() {
      if (!id) {
        setTranscriptText("No replay ID provided for transcript.");
        return;
      }

      try {
        const replayRes = await fetch(`${import.meta.env.VITE_API_URL}/replays/${id}`, {
          credentials: "include",
        });

        if (!replayRes.ok) throw new Error(`Metadata fetch failed: ${replayRes.status}`);
        const replayData = await replayRes.json();

        const audioId = replayData.audio_id;

        if (!audioId) {
          if (!cancelled) setTranscriptText("No audio linked to this replay.");
          return;
        }

        const transcriptRes = await fetch(`${import.meta.env.VITE_API_URL}/audio/${audioId}/transcriptions`, {
          credentials: "include",
        });

        if (!transcriptRes.ok) throw new Error(`Transcript fetch failed: ${transcriptRes.status}`);
        const masterJson = await transcriptRes.json();

        if (Object.keys(masterJson).length === 0) {
          if (!cancelled) setTranscriptText("No transcripts generated yet.");
          return;
        }

        const combined: TranscriptSegment[] = [];
        for (const [discordId, segments] of Object.entries(masterJson)) {
          for (const seg of (segments as any[])) {
            combined.push({
              discordId,
              start: seg.start,
              end: seg.end,
              text: seg.text,
            });
          }
        }

        combined.sort((a, b) => a.start - b.start);

        if (!cancelled) {
          setTranscripts(combined);
          setTranscriptText("");
        }
      } catch (e) {
        if (!cancelled) {
          setTranscriptText("Failed to load transcript. Check console.");
        }
      }
    }

    void fetchTranscript();

    return () => {
      cancelled = true;
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

  // Resolve the currently active round from the global replay clock.
  const activeRound = roundStartTicks.length > 0
    ? getRoundFromTick(
      roundStartTicks,
      replayStartTick + currentTimeSec * ticksPerSecond,
    )
    : 1;

  // Derive absolute replay bounds for the active round.
  const replayEndTick = replayStartTick + durationSec * ticksPerSecond;
  const activeRoundIndex = Math.max(0, activeRound - 1);
  const activeRoundStartTick = roundStartTicks[activeRoundIndex] ?? replayStartTick;
  const activeRoundEndTick = roundStartTicks[activeRoundIndex + 1] ?? replayEndTick;

  // Convert active round bounds into replay seconds.
  const activeRoundStartSec = Math.max(0, (activeRoundStartTick - replayStartTick) / ticksPerSecond);
  const activeRoundEndSec = Math.max(activeRoundStartSec, (activeRoundEndTick - replayStartTick) / ticksPerSecond);

  // Round-local values used by the transport UI (slider/time label).
  const activeRoundDurationSec = Math.max(0, activeRoundEndSec - activeRoundStartSec);
  const activeRoundElapsedSec = Math.min(
    activeRoundDurationSec,
    Math.max(0, currentTimeSec - activeRoundStartSec),
  );

  if (fetchError) {
    return (
      <div className="w-full flex-1 flex items-center justify-center text-red-400 p-8">
        <p className="text-xl font-semibold">Error: {fetchError}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden flex flex-col gap-4">
      {/* TODO(placeholder): Replace with real replay title (e.g., team names from replay metadata). */}
      <h1 className="text-center text-2xl font-semibold text-slate-100">
        Team 1 vs. Team 2
      </h1>

      <div className="flex w-full items-start justify-center gap-4">
        <div className="flex h-[720px] w-28 shrink-0 flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`player-icon-${index}`}
              className={`flex w-full flex-col items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 p-2 ${
                index === 5 ? "mt-auto border-t border-slate-600 pt-3" : ""
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700">
                <User className="h-5 w-5 text-slate-300" />
              </div>
              {/* TODO(placeholder): Replace with mapped Discord display names per speaker/channel. */}
              <div className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-300">
                {index === 5 ? "Discord Coach" : "Discord Player"}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"
                  aria-label={`Mute player ${index + 1}`}
                >
                  <MicOff className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"
                  aria-label={`Unmute player ${index + 1}`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-[720px] aspect-square border border-slate-700 rounded-xl overflow-hidden shrink-0">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        <aside className="w-full max-w-[320px] h-[720px] rounded-xl border border-slate-700 bg-slate-900/90 p-3 flex flex-col">
          <div className="mb-2 shrink-0 text-sm font-semibold text-slate-200">Match Comms</div>
          <div
            className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-2 text-sm text-slate-300"
            aria-live="polite"
          >
            {transcripts.length > 0
              ? (
                <div className="flex flex-col gap-3">
                  {transcripts.map((t, i) => (
                    <div key={i} className="flex flex-col">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-slate-500 font-mono">[{formatTime(t.start)}]</span>
                        <span className="font-semibold text-blue-400 text-xs truncate max-w-[150px]">
                          {t.discordId}
                        </span>
                      </div>
                      <span className="text-slate-200 leading-snug">{t.text}</span>
                    </div>
                  ))}
                </div>
              )
              : (
                <div className="h-full flex items-center justify-center">
                  <p className="whitespace-pre-wrap text-slate-400 italic text-center px-4">
                    {transcriptText}
                  </p>
                </div>
              )}
          </div>
        </aside>
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
            max={activeRoundDurationSec}
            step={0.01}
            value={activeRoundElapsedSec}
            onMouseDown={() => setIsPlaying(false)}
            onChange={(e) => {
              // Map round-local seek back into absolute replay seconds.
              const sec = Number(e.target.value);
              handleSeek(activeRoundStartSec + sec);
            }}
            className="flex-1 cursor-pointer"
            disabled={isFetching}
          />

          <span className="text-white">
            {formatTime(activeRoundElapsedSec)} / {formatTime(activeRoundDurationSec)}
          </span>
        </div>

        <div className="flex w-full max-w-[600px] flex-wrap self-center justify-center gap-1.5 pb-1">
          {roundStartTicks.map((_, index) => {
            const roundNumber = index + 1;
            const isCurrent = roundNumber === activeRound;

            return (
              <div key={roundNumber} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRoundSelect(index)}
                  className={`h-7 w-7 rounded-full border text-xs font-semibold flex items-center justify-center transition-colors ${
                    isCurrent
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

                {roundNumber === 24 && roundStartTicks.length > 25 && (
                  <div
                    className="flex h-7 w-7 items-center justify-center text-slate-300"
                    title="Overtime rounds"
                  >
                    <Clock3 className="h-4 w-4" />
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

// Finds the current round number (1-indexed) from a replay tick.
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

// Formats seconds as mm:ss for transport UI.
function formatTime(sec: number): string {
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
