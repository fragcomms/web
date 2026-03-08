import { Clock, Music } from "lucide-react";

interface AudioItemProps {
  audio: {
    audio_id: string;
    creation_time: string;
    sampling_rate: number;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

export function AudioItem({
  audio,
  isSelected = false,
  onClick,
}: AudioItemProps) {
  return (
    <div
      className={`group flex items-center gap-6 rounded-lg bg-[#151d2b] border p-4 hover:border-indigo-600 hover:bg-[#1a2332] cursor-pointer transition-all ${
        isSelected ? "border-indigo-500" : "border-[#1e2936]"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative flex h-24 w-40 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-900/50 to-purple-900/50 overflow-hidden">
        <Music className="h-10 w-10 text-indigo-400" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="text-sm text-gray-300">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Fetch Time: {new Date(audio.creation_time).toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Audio ID: {audio.audio_id} * {audio.sampling_rate} Hz
          </div>
        </div>
      </div>
    </div>
  );
}
