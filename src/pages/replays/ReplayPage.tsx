"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { AudioSyncPlayer } from "../../utils/media/AudioSyncPlayer";
import { useReplayEngine } from "./ReplayEngine";
import { useReplayMedia } from "./ReplayMedia";

import { MuteSidebar } from "./components/MuteSidebar";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { TransportBar } from "./components/TransportBar";

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

  // initialize the replay engine and media (transcripts + audio) using the replay ID from URL
  const {
    frame,    // get current frame data to show player stats on page
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
  } = useReplayEngine(id, canvasRef, audioPlayerRef);

  // master hook to handle all media related
  const {
    transcriptText,
    transcripts,
    discordUsers,
    discordNames,
    mutedUsers,
    toggleMute,
  } = useReplayMedia(id, audioPlayerRef);

  // Handle round selection from the transport bar
  // TODO: logic is kinda screwed, should pause once round is finished
  // +12 is decided by the tick interval in our parser
  const handleRoundSelect = useCallback((roundIndex: number) => {
    const seekSec = Math.max(0, ((roundStartTicks[roundIndex]+12) - replayStartTick) / ticksPerSecond);
    setIsPlaying(true);
    handleSeek(seekSec);
  }, [roundStartTicks, replayStartTick, ticksPerSecond, setIsPlaying, handleSeek]);

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

  if (fetchError) {
    return (
      <div className="w-full flex-1 flex items-center justify-center text-red-400 p-8">
        <p className="text-xl font-semibold">Error: {fetchError}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden flex flex-col gap-4">
      <h1 className="text-center text-2xl font-semibold text-slate-100">Team 1 vs. Team 2</h1>

      <div className="flex w-full items-start justify-center gap-4">
        {/* Left Discord User Mute Sidebar */}
        <MuteSidebar
          discordUsers={discordUsers}
          mutedUsers={mutedUsers}
          discordNames={discordNames}
          toggleMute={toggleMute}
        />

        {/* Center Canvas */}
        <div className="w-full max-w-[720px] aspect-square border border-slate-700 rounded-xl overflow-hidden shrink-0">
          <canvas ref={canvasRef} className="block w-full h-full" />
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
        isFetching={isFetching}
        activeRoundDurationSec={activeRoundDurationSec}
        activeRoundElapsedSec={activeRoundElapsedSec}
        activeRoundStartSec={activeRoundStartSec}
        handleSeek={handleSeek}
        roundStartTicks={roundStartTicks}
        activeRound={activeRound}
        handleRoundSelect={handleRoundSelect}
        formatTime={formatTime}
      />

      {/* Bottom Health Bars (Proto Scoreboard) */}
      {frame && (
        <div className="w-full border-t border-slate-700 mt-6 pt-4 text-white text-sm">
          <div className="max-w-[1200px] mx-auto flex justify-between gap-10 px-6">

            {/* CT Team */}
            <div className="flex flex-col gap-2 w-full">
              <div className="text-blue-400 font-semibold">
                CT ({frame.players.filter(p => p.team === 3 && p.alive).length})
              </div>

              {frame.players
                .filter(p => p.team === 3)
                .sort((a, b) => a.steamid.localeCompare(b.steamid))
                .map(p => (
                  <div key={p.steamid} className={`flex items-center gap-2" ${p.alive ? "" : "opacity-40"}`}>

                    {/*Steam ID on outside (soon to be steam name) */}
                    <div className="text-left whitespace-nowrap"> steam id: {p.steamid} </div>

                    {/* Health bar (middle) */}
                    <div className="w-1/2 h-2 bg-slate-700 rounded overflow-hidden">
                      <div
                        className="bg-blue-500 h-full"
                        style={{ width: `${Math.max(p.hp, 0)}%` }}
                      />
                    </div>

                    {/* HP (number) on inside */}
                    <div className="w-12 text-right">
                      {p.alive ? p.hp : "DEAD"}
                    </div>

                  </div>
                ))}
            </div>

            {/* T Team */}
            <div className="flex flex-col gap-2 w-full">
              <div className="text-yellow-400 font-semibold">
                T ({frame.players.filter(p => p.team === 2 && p.alive).length})
              </div>

              {frame.players
                .filter(p => p.team === 2)
                .sort((a, b) => a.steamid.localeCompare(b.steamid))
                .map(p => (
                  <div key={p.steamid} className={`flex items-center gap-2 ${p.alive ? "" : "opacity-40"}`}>

                    {/* Health (number) on inside */}
                    <div className="w-12 text-right">
                      {p.alive ? p.hp : "DEAD"}
                    </div>

                    {/* Health bar (middle) */}
                    <div className="w-1/2 h-2 bg-slate-700 rounded overflow-hidden">
                      <div
                        className="bg-yellow-500 h-full"
                        style={{ width: `${Math.max(p.hp, 0)}%` }}
                      />
                    </div>

                    {/*Steam ID on outside (soon to be steam name) */}
                    <div className="text-right whitespace-nowrap"> steam id: {p.steamid}</div>

                    

                  </div>
                ))}
            </div>

          </div>

        </div>
      )}
    </div>


    

    
  );


}
