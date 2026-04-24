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
}

export const TranscriptPanel = memo(function TranscriptPanel(
  { transcripts, mutedUsers, filteredUser, discordNames, transcriptText, formatTime, currentTimeSec, onDownloadTranscript, onDownloadAudio }: TranscriptPanelProps,
) {
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  const visibleTranscripts = useMemo(
    () => transcripts.filter((segment) => segment.start >= 0),
    [transcripts],
  );

  const activeIndices = useMemo(() => {
    const indices = new Set<number>();
    for (let index = 0; index < visibleTranscripts.length; index++) {
      const transcript = visibleTranscripts[index];
      if (currentTimeSec >= transcript.start && currentTimeSec <= transcript.end) {
        indices.add(index);
      }
    }
    return indices;
  }, [visibleTranscripts, currentTimeSec]);

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
    <aside className="w-full max-w-96 h-180 rounded-xl border border-slate-700 bg-slate-900/90 p-3 flex flex-col">
      <div className="mb-2 shrink-0 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-200">Match Communications:</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Transcript actions"
              title="Transcript actions"
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700 text-slate-200">
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
        className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-2 text-sm text-slate-300"
        aria-live="polite"
      >
        {visibleTranscripts.length > 0
          ? (
            <div ref={transcriptContainerRef} className="flex flex-col">
              {visibleTranscripts.map((t, i) => (
                <div
                  key={i}
                  data-segment-index={i}
                  className={`flex flex-col rounded-md border p-2 transition-all ${
                    activeIndices.has(i)
                      ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.45)]"
                      : "border-transparent"
                  } 
                  ${(filteredUser !== null ? filteredUser !== t.discordId : mutedUsers[t.discordId]) ? "opacity-30" : ""}`}>                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-slate-500 font-mono">
                      [{formatTime(t.start)} - {formatTime(t.end)}]
                    </span>
                    <span className="font-semibold text-blue-400 text-xs truncate max-w-37.5">
                      {discordNames[t.discordId] || t.discordId}
                    </span>
                  </div>
                  <span className="text-slate-200 leading-snug">{t.text}</span>
                </div>
              ))}
            </div>
          )
          : (
            <div className="h-full flex items-center justify-center">
              <p className="whitespace-pre-wrap text-slate-400 italic text-center px-4">{transcriptText}</p>
            </div>
          )}
      </div>
    </aside>
  );
});
