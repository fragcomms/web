import { memo } from "react";
import type { TranscriptSegment } from "../ReplayMedia";

interface TranscriptPanelProps {
  transcripts: TranscriptSegment[];
  mutedUsers: Record<string, boolean>;
  discordNames: Record<string, string>;
  transcriptText: string;
  formatTime: (sec: number) => string;
}

export const TranscriptPanel = memo(function TranscriptPanel(
  { transcripts, mutedUsers, discordNames, transcriptText, formatTime }: TranscriptPanelProps,
) {
  return (
    <aside className="w-full max-w-[320px] h-[720px] rounded-xl border border-slate-700 bg-slate-900/90 p-3 flex flex-col">
      <div className="mb-2 shrink-0 text-sm font-semibold text-slate-200">Match Communications:</div>
      <div
        className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-2 text-sm text-slate-300"
        aria-live="polite"
      >
        {transcripts.length > 0
          ? (
            <div className="flex flex-col gap-3">
              {transcripts.map((t, i) => (
                <div key={i} className={`flex flex-col ${mutedUsers[t.discordId] ? "opacity-30" : ""}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-slate-500 font-mono">[{formatTime(t.start)}]</span>
                    <span className="font-semibold text-blue-400 text-xs truncate max-w-[150px]">
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
