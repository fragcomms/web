import { ArrowLeftRight, Clock3 } from "lucide-react";
import { memo } from "react";

interface TransportBarProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean | ((p: boolean) => boolean)) => void;
  isFetching: boolean;
  activeRoundDurationSec: number;
  activeRoundElapsedSec: number;
  activeRoundStartSec: number;
  handleSeek: (sec: number) => void;
  roundStartTicks: number[];
  activeRound: number;
  handleRoundSelect: (index: number) => void;
  formatTime: (sec: number) => string;
}

export const TransportBar = memo(function TransportBar({
  isPlaying,
  setIsPlaying,
  isFetching,
  activeRoundDurationSec,
  activeRoundElapsedSec,
  activeRoundStartSec,
  handleSeek,
  roundStartTicks,
  activeRound,
  handleRoundSelect,
  formatTime,
}: TransportBarProps) {
  return (
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
          onChange={(e) => handleSeek(activeRoundStartSec + Number(e.target.value))}
          className="flex-1 cursor-pointer"
          disabled={isFetching}
        />
        <span className="text-white">{formatTime(activeRoundElapsedSec)} / {formatTime(activeRoundDurationSec)}</span>
      </div>

      <div className="w-full max-w-[1200px] self-center">
        <div className="mb-2 flex justify-center">
          <p className="rounded-full border border-slate-700/80 bg-transparent px-3 py-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">
            Match Rounds
          </p>
        </div>
        <div className="flex w-full flex-nowrap justify-center gap-2 overflow-hidden pb-1">
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
                disabled={isFetching}
              >
                {roundNumber}
              </button>
              {roundNumber === 12 && roundStartTicks.length > 12 && (
                <div className="flex h-7 w-7 items-center justify-center text-slate-300">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
              )}
              {roundNumber === 24 && roundStartTicks.length > 25 && (
                <div className="flex h-7 w-7 items-center justify-center text-slate-300">
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
});
