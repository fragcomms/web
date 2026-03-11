"use client";

import { useEffect, useRef } from "react";
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
  const handleRoundSelect = (roundIndex: number) => {
    const seekSec = Math.max(0, (roundStartTicks[roundIndex] - replayStartTick) / ticksPerSecond);
    setIsPlaying(true);
    handleSeek(seekSec);
  };

  // Calculate active round and its timing info based on the current replay time
  const activeRound = roundStartTicks.length > 0 ? getRoundFromTick(roundStartTicks, replayStartTick + currentTimeSec * ticksPerSecond) : 1;

  const activeRoundIndex = Math.max(0, activeRound - 1);
  const activeRoundStartTick = roundStartTicks[activeRoundIndex] ?? replayStartTick;
  const activeRoundEndTick = roundStartTicks[activeRoundIndex + 1] ?? (replayStartTick + durationSec * ticksPerSecond);

  // convert all that tick info into seconds for easier handling in the transport bar
  const activeRoundStartSec = Math.max(0, (activeRoundStartTick - replayStartTick) / ticksPerSecond);
  const activeRoundDurationSec = Math.max(
    0,
    Math.max(activeRoundStartSec, (activeRoundEndTick - replayStartTick) / ticksPerSecond) - activeRoundStartSec,
  );
  const activeRoundElapsedSec = Math.min(activeRoundDurationSec, Math.max(0, currentTimeSec - activeRoundStartSec));

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
        { /* Left Discord User Mute Sidebar */}
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
    </div>
  );
}
