import { ArrowLeftRight, Clock3, Pause, Play } from "lucide-react";
import { memo, useState, useCallback, startTransition } from "react"; // <-- Import startTransition

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
  
  // Track dragging state and the temporary visual value
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  // Determine what to show on the screen instantly
  const displayValue = isDragging ? dragValue : activeRoundElapsedSec;

  const handlePointerDown = useCallback(() => {
    setIsPlaying(false);
    setIsDragging(true);
    setDragValue(activeRoundElapsedSec);
  }, [setIsPlaying, activeRoundElapsedSec]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    // Final high-priority seek when they let go of the mouse
    handleSeek(activeRoundStartSec + dragValue);
  }, [handleSeek, activeRoundStartSec, dragValue]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    
    setDragValue(val); 

    startTransition(() => {
      handleSeek(activeRoundStartSec + val);
    });
    
  }, [activeRoundStartSec, handleSeek]);

  return (
    <div className="w-full flex flex-col items-center gap-1.5 self-center">
      <div className="flex items-center gap-2 w-full max-w-200">
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
          disabled={isFetching}
          title={isPlaying ? "Pause" : "Play"}
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={activeRoundDurationSec}
          step={0.01}
          value={displayValue} 
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onChange={handleSliderChange}
          className="flex-1 cursor-pointer"
          disabled={isFetching}
        />
        <span className="text-slate-700 dark:text-white">
          {formatTime(displayValue)} / {formatTime(activeRoundDurationSec)}
        </span>
      </div>

      <div className="w-full max-w-300 self-center">
        <div className="flex w-full flex-nowrap justify-center gap-2 overflow-hidden">
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
                    : "bg-white border-slate-300 text-slate-700 hover:border-slate-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-400 dark:hover:text-white"
                }`}
                disabled={isFetching}
              >
                {roundNumber}
              </button>
              {roundNumber === 12 && roundStartTicks.length > 12 && (
                <div className="flex h-7 w-7 items-center justify-center text-slate-500 dark:text-slate-300">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
              )}
              {roundNumber === 24 && roundStartTicks.length > 25 && (
                <div className="flex h-7 w-7 items-center justify-center text-slate-500 dark:text-slate-300">
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