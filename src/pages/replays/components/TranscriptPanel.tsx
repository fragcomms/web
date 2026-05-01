import { memo, useEffect, useMemo, useRef } from "react";
import { ArrowDownToLine, EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import type { TranscriptSegment } from "../ReplayMedia";

interface TranscriptPanelProps {
  transcripts: TranscriptSegment[];
  mutedUsers: Record<string, boolean>;
  filteredUser: string | null;
  discordNames: Record<string, string>;
  transcriptText: string;
  formatTime: (sec: number) => string;
  currentTimeSec: number;
  onDownloadTranscript: () => void;
  onDownloadAudio: () => void;
  syncOffsetSec: number;
  syncStartsFirst: boolean;
  onSeek?: (timeSec: number) => void;
  roundStartTicks?: number[];
  replayStartTick?: number;
  ticksPerSecond?: number;
}

export const TranscriptPanel = memo(function TranscriptPanel(
  { transcripts, mutedUsers, filteredUser, discordNames, transcriptText, formatTime, currentTimeSec, onDownloadTranscript, onDownloadAudio, syncOffsetSec = 0, syncStartsFirst = true, onSeek, roundStartTicks = [], replayStartTick = 0, ticksPerSecond = 1 }: TranscriptPanelProps,
) {
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  // Helper function to get round number from tick
  const getRoundFromTick = (tick: number): number => {
    if (roundStartTicks.length === 0) return 1;
    let round = 1;
    for (let i = 0; i < roundStartTicks.length; i++) {
      if (tick >= roundStartTicks[i]) round = i + 1;
      else break;
    }
    return round;
  };

  // Helper function to get time within a round
  const getTimeInRound = (startTimeSec: number): number => {
    const tick = replayStartTick + startTimeSec * ticksPerSecond;
    const roundIndex = Math.max(0, getRoundFromTick(tick) - 1);
    const roundStartTick = roundStartTicks[roundIndex] ?? replayStartTick;
    const roundStartSec = (roundStartTick - replayStartTick) / ticksPerSecond;
    return Math.max(0, startTimeSec - roundStartSec);
  };

  const offset = Number(syncOffsetSec) || 0;
  const visibleTranscripts = useMemo(
    () => transcripts.filter((segment) => {
      const adjustedEnd = syncStartsFirst 
        ? segment.end - offset 
        : segment.end + offset;
      return adjustedEnd >= 0;
    }),
    [transcripts, offset, syncStartsFirst],
  );
  const activeIndices = useMemo(() => {
    const indices = new Set<number>();
    for (let index = 0; index < visibleTranscripts.length; index++) {
      const t = visibleTranscripts[index];
      const adjustedStart = syncStartsFirst 
        ? t.start - offset 
        : t.start + offset;
      const adjustedEnd = syncStartsFirst 
        ? t.end - offset 
        : t.end + offset;
      if (currentTimeSec >= adjustedStart && currentTimeSec <= adjustedEnd) {
        indices.add(index);
      }
      // if (currentTimeSec >= transcript.start && currentTimeSec <= transcript.end) {
      //   indices.add(index);
      // }
    }
    return indices;
  }, [visibleTranscripts, currentTimeSec, offset, syncStartsFirst]);

  const firstActiveIndex = useMemo(() => {
    if (activeIndices.size === 0) return -1;
    return Math.min(...activeIndices);
  }, [activeIndices]);

  useEffect(() => {
    if (firstActiveIndex < 0 || !transcriptContainerRef.current) return;

    const activeElement = transcriptContainerRef.current.querySelector<HTMLDivElement>(
      `[data-segment-index="${firstActiveIndex}"]`,
    );
    activeElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [firstActiveIndex]);

  return (
    <aside className="w-full max-w-96 h-180 rounded-xl border border-slate-300 bg-white/90 p-3 flex flex-col dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mb-2 shrink-0 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Match Communications:</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Transcript actions"
              title="Transcript actions"
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <DropdownMenuItem 
            className="cursor-pointer gap-2 whitespace-nowrap"
              onClick={onDownloadAudio}
              disabled={visibleTranscripts.length === 0}
            >
              <span>Download Audio</span>
              <ArrowDownToLine className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer gap-2 whitespace-nowrap"
              onClick={onDownloadTranscript}
              disabled={visibleTranscripts.length === 0}
            >
              <span>Download Transcript</span>
              <ArrowDownToLine className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/80 p-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"
        aria-live="polite"
      >
        {visibleTranscripts.length > 0
          ? (
            <div ref={transcriptContainerRef} className="flex flex-col">
              {visibleTranscripts.map((t, i) => (
                <div
                  key={i}
                  data-segment-index={i}
                  onClick={() => {
                    const adjustedStart = syncStartsFirst 
                      ? t.start - syncOffsetSec 
                      : t.start + syncOffsetSec;
                    const seekTime = Math.max(0, adjustedStart);
                    onSeek?.(seekTime);
                  }}
                  className={`flex flex-col rounded-md border p-2 transition-all cursor-pointer ${
                    activeIndices.has(i)
                      ? "border-cyan-500 bg-cyan-100/70 shadow-[0_0_0_1px_rgba(14,116,144,0.35)] dark:border-cyan-400 dark:bg-cyan-500/10 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.45)]"
                      : "border-transparent hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md"
                  } 
                  ${(filteredUser !== null ? filteredUser !== t.discordId : mutedUsers[t.discordId]) ? "opacity-30" : ""}`}>                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="font-semibold text-blue-700 dark:text-blue-400 text-xs truncate max-w-37.5">
                      {discordNames[t.discordId] || t.discordId}
                    </span>
                    <span className="ml-auto flex items-center gap-2 whitespace-nowrap">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                        [Round {getRoundFromTick(replayStartTick + (syncStartsFirst ? t.start - syncOffsetSec : t.start + syncOffsetSec) * ticksPerSecond)}] [{formatTime(getTimeInRound(syncStartsFirst ? t.start - syncOffsetSec : t.start + syncOffsetSec))}]
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono text-right">
                        [{formatTime(syncStartsFirst ? t.start - syncOffsetSec : t.start + syncOffsetSec)}]
                      </span>
                    </span>
                  </div>
                  <span className="text-slate-800 dark:text-slate-200 leading-snug">{t.text}</span>
                </div>
              ))}
            </div>
          )
          : (
            <div className="h-full flex items-center justify-center">
              <p className="whitespace-pre-wrap text-slate-500 dark:text-slate-400 italic text-center px-4">{transcriptText}</p>
            </div>
          )}
      </div>
    </aside>
  );
});
