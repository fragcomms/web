"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { AudioSyncPlayer } from "../../utils/media/AudioSyncPlayer";
import { useReplayEngine } from "./ReplayBackend";
import { useReplayMedia } from "./ReplayMedia";

import { MuteSidebar } from "./components/MuteSidebar";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { TransportBar } from "./components/TransportBar";

import  type { ReplayPlayer } from "./components/PlayerCard";
import PlayerCard from "./components/PlayerCard";
import { PlayerCardPlaceholder } from "./components/PlayerCard";

function getRoundFromTick(roundStartTicks: number[], currentTick: number): number {
  if (roundStartTicks.length === 0) return 1;
  let round = 1;
  for (let i = 0; i < roundStartTicks.length; i++) {
    if (currentTick >= roundStartTicks[i]) round = i + 1;
    else break;
  }
  return round;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ReplayPage() {
  // Get replay ID from URL params
  const { id } = useParams<{ id: string; }>();
  // Canvas target where WebGPU renders each replay frame
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioPlayerRef = useRef<AudioSyncPlayer | null>(null);

  // initialize the AudioSyncPlayer once on mount and clean up on unmount
  useEffect(() => {
    audioPlayerRef.current = new AudioSyncPlayer();
    return () => audioPlayerRef.current?.destroy();
  }, []);

  // master hook to handle all media related
  const {
    transcriptText,
    transcripts,
    discordUsers,
    discordNames,
    mutedUsers,
    toggleMute,
    audioStartOffsetSec,
    audioDurationSec,
    audioSyncWarning,
  } = useReplayMedia(id, audioPlayerRef);

  // initialize the replay engine and media (transcripts + audio) using the replay ID from URL
  const {
    frame, // get current frame data to show player stats on page
    isPlaying,
    setIsPlaying,
    setIsScrubbing,
    currentTimeSec,
    durationSec,
    replayStartTick,
    roundStartTicks,
    ticksPerSecond,
    isFetching,
    fetchError,
    handleSeek,
    handlePreviewSeek,
    scoreCT,
    scoreT,
    canvasHandlers,
    // replayMeta, // check final score (testing)
  } = useReplayEngine(id, canvasRef, audioPlayerRef, {
    audioStartOffsetSec,
    audioDurationSec,
    audioSyncDisabled: audioSyncWarning !== null,
  });

  // check final score in logs
  // console.log("Final Score should be ", replayMeta?.final_score);

  // Handle round selection from the transport bar
  // TODO: logic is kinda screwed, should pause once round is finished
  // +12 is decided by the tick interval in our parser
  const handleRoundSelect = useCallback((roundIndex: number) => {
    const seekSec = Math.max(0, ((roundStartTicks[roundIndex] + 12) - replayStartTick) / ticksPerSecond);
    setIsPlaying(true);
    startTransition(() => {
      handleSeek(seekSec);
    });
  }, [roundStartTicks, replayStartTick, ticksPerSecond, setIsPlaying, handleSeek]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (canvasHandlers?.onWheel) {
        canvasHandlers.onWheel(e as unknown as React.WheelEvent<HTMLCanvasElement>);
      }
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleNativeWheel);
    };
  }, [canvasHandlers]);

  useEffect(() => {
    function handleSpacebarToggle(event: KeyboardEvent) {
      if (event.code !== "Space") return;

      const target = event.target as HTMLElement | null;
      if (
        target
        && (
          target.tagName === "INPUT"
          || target.tagName === "TEXTAREA"
          || target.isContentEditable
        )
      ) {
        return;
      }

      event.preventDefault();
      setIsPlaying((playing) => !playing);
    }

    window.addEventListener("keydown", handleSpacebarToggle);
    return () => window.removeEventListener("keydown", handleSpacebarToggle);
  }, [setIsPlaying]);

  // Calculate active round and its timing info based on the current replay time
  const { activeRound, activeRoundStartSec, activeRoundDurationSec, activeRoundElapsedSec } = useMemo(() => {
    const currentActiveRound = roundStartTicks.length > 0
      ? getRoundFromTick(roundStartTicks, replayStartTick + currentTimeSec * ticksPerSecond)
      : 1;

    const activeRoundIndex = Math.max(0, currentActiveRound - 1);

    const rawStartTick = roundStartTicks[activeRoundIndex] ?? replayStartTick;
    const rawEndTick = roundStartTicks[activeRoundIndex + 1] ?? (replayStartTick + durationSec * ticksPerSecond);

    // slice teleport tick out
    const activeRoundStartTick = activeRoundIndex === 0 ? rawStartTick : rawStartTick + 12;
    const activeRoundEndTick = activeRoundIndex + 1 < roundStartTicks.length ? rawEndTick - 1 : rawEndTick;

    const startSec = Math.max(0, (activeRoundStartTick - replayStartTick) / ticksPerSecond);
    const endSec = Math.max(startSec, (activeRoundEndTick - replayStartTick) / ticksPerSecond);

    // fleshed out concept of duration
    const duration = endSec - startSec;
    const elapsed = Math.min(duration, Math.max(0, currentTimeSec - startSec));

    
    return {
      activeRound: currentActiveRound,
      activeRoundStartSec: startSec,
      activeRoundDurationSec: duration,
      activeRoundElapsedSec: elapsed,
    };
  }, [currentTimeSec, roundStartTicks, replayStartTick, ticksPerSecond, durationSec]);

  // halftime
  const isSecondHalf = activeRound > 12; // needs to be declared after activeRound

  // Team IDs (needed for switch after halftime)
  const leftTeamID = isSecondHalf ? 2 : 3; // team IDs are switched in second half
  const rightTeamID = isSecondHalf ? 3 : 2;

  // might be reworked so that pro team names follow the players
  const leftTeamName = "Counter-Terrorists";
  const rightTeamName = "Terrorists";

  // scores
  const score_CT = scoreCT;
  const score_T = scoreT;

  const players = frame?.players ?? [];
  const isLoaded = frame;
  const isLoading = !frame;

  const getTeamPlayers = (teamId: number): ReplayPlayer[] =>
    (players)
      .filter((player) => player.team === teamId)
      .sort((a, b) => a.steamid.localeCompare(b.steamid));

  const leftTeamPlayers = getTeamPlayers(leftTeamID);
  const rightTeamPlayers = getTeamPlayers(rightTeamID);

  

  if (fetchError) {
    return (
      <div className="w-full flex-1 flex items-center justify-center text-red-400 p-8">
        <p className="text-xl font-semibold">Error: {fetchError}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden flex flex-col gap-4">
      {audioSyncWarning && (
        <div className="mx-auto w-full max-w-300 rounded-md border border-amber-600/60 bg-amber-900/20 px-4 py-2 text-sm text-amber-200">
          {audioSyncWarning}
        </div>
      )}

      {/* Top Audio Controls Bar */}
      <div className="w-full">
        <MuteSidebar
          discordUsers={discordUsers}
          mutedUsers={mutedUsers}
          discordNames={discordNames}
          toggleMute={toggleMute}
          isHorizontal={true}
        />
      </div>

      <div className="flex w-full items-start justify-center gap-4">
        {/* Left Health Bars */}
        { 
          <div className="flex h-180 w-80 shrink-0 flex-col gap-3">
            {/* CT Team Container (Top Half) */}
            <div className="flex min-h-0 flex-1 flex-col justify-center rounded-lg border border-blue-300 bg-blue-50/90 p-2 dark:border-blue-900/40 dark:bg-blue-950/15">
              <div className="mb-2 text-center text-sm leading-tight">
                <div className="font-semibold text-blue-700 dark:text-blue-400">
                  {leftTeamName}
                  <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-sm bg-blue-600 text-xs font-bold text-white dark:bg-blue-900/70 dark:text-blue-100">
                    {isSecondHalf ? score_T : score_CT}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {isLoading
                  ?  Array.from({ length: 5 }, (_, i) => (
                    <PlayerCardPlaceholder 
                      key={`ct-skeleton-${i}`}
                      ringColor="rgb(59 130 246)"
                      centerTextColorClass="text-blue-700 dark:text-blue-100"
                  />
                  )) 
                  : leftTeamPlayers.map((player) =>(
                    <PlayerCard // STEAM WHEN LOADED
                      key={player.steamid}
                      player={player}
                      ringColor="rgb(59 130 246)"
                      centerTextColorClass="text-blue-700 dark:text-blue-100"
                    />
                  ))
                }
                
              </div>
            </div>

            {/* T Team Container (Bottom Half) */}
            <div className="flex min-h-0 flex-1 flex-col justify-center rounded-lg border border-amber-300 bg-amber-50/90 p-2 dark:border-yellow-900/40 dark:bg-yellow-950/10">
              <div className="mb-2 text-center text-sm leading-tight">
                <div className="font-semibold text-amber-700 dark:text-yellow-400">
                  {rightTeamName}
                  <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-sm bg-amber-600 text-xs font-bold text-white dark:bg-yellow-900/70 dark:text-yellow-100">
                    {isSecondHalf ? score_CT : score_T}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {isLoading
                  ? Array.from({ length: 5 }, (_, i) => (
                    <PlayerCardPlaceholder 
                      key={`t-skeleton-${i}`}
                      ringColor="rgb(234 179 8)"
                      centerTextColorClass="text-amber-700 dark:text-yellow-100"
                    />  
                  )) 
                  : rightTeamPlayers.map((player) => (
                    <PlayerCard
                      key={player.steamid}
                      player={player}
                      ringColor="rgb(234 179 8)"
                      centerTextColorClass="text-amber-700 dark:text-yellow-100"
                    />
                  ))
                }
              </div>
            </div>
          </div>
        }

        {/* Center Canvas */}
        <div className="relative w-full max-w-180 aspect-square overflow-hidden rounded-xl border border-slate-300 shrink-0 dark:border-slate-700">
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-slate-300 bg-white/90 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-700 dark:border-slate-600/80 dark:bg-slate-900/75 dark:text-slate-100">
            Replay #{id ?? "Unknown"}
          </div>
          <canvas
            ref={canvasRef}
            className="block w-full h-full cursor-grab active:cursor-grabbing"
            {...canvasHandlers}
            style={{ touchAction: "none" }}
          />
        </div>

        {/* Right Transcript Panel */}
        <TranscriptPanel
          transcripts={transcripts}
          mutedUsers={mutedUsers}
          discordNames={discordNames}
          transcriptText={transcriptText}
          formatTime={formatTime}
        />
      </div>

      {/* Bottom Transport Bar with round selection and seek controls */}
      <TransportBar
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        setIsScrubbing={setIsScrubbing}
        isFetching={isFetching}
        activeRoundDurationSec={activeRoundDurationSec}
        activeRoundElapsedSec={activeRoundElapsedSec}
        activeRoundStartSec={activeRoundStartSec}
        handleSeek={handleSeek}
        handlePreviewSeek={handlePreviewSeek}
        roundStartTicks={roundStartTicks}
        activeRound={activeRound}
        handleRoundSelect={handleRoundSelect}
        formatTime={formatTime}
      />

      {/* Bottom Score Display */}
      {frame && (
        <div className="w-full border-t border-slate-700 mt-6 pt-4 pb-6 text-white text-sm">
          <div className="max-w-300 mx-auto flex justify-center gap-16 px-6">
            <div className="text-center">
              <div className="text-blue-400 font-semibold">{leftTeamName}</div>
              <div className="text-blue-300 text-2xl font-semibold">{isSecondHalf ? score_T : score_CT}</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 font-semibold">{rightTeamName}</div>
              <div className="text-yellow-300 text-2xl font-semibold">{isSecondHalf ? score_CT : score_T}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
