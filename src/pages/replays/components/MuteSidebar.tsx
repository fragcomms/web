import { Mic, MicOff, User } from "lucide-react";
import { memo } from "react";
import { useAuth } from "../../../utils/context/context";

interface MuteSidebarProps {
  discordUsers: string[];
  activeUserIds: Set<string>;
  mutedUsers: Record<string, boolean>;
  volumes: Record<string, number>;
  onVolumeChange: (discordId: string, volume: number) => void;
  discordNames: Record<string, string>;
  toggleMute: (discordId: string) => void;
  filteredUser: string | null;
  onFilteredUser: (discordId: string) => void;
  isHorizontal?: boolean;
}

export const MuteSidebar = memo(
  function MuteSidebar({ discordUsers, activeUserIds, mutedUsers, volumes, onVolumeChange, discordNames, toggleMute, filteredUser, onFilteredUser, isHorizontal = false }: MuteSidebarProps) {
    const paddedUsers = [...discordUsers, ...Array(6 - discordUsers.length).fill("")].slice(0, 6);
    const { user } = useAuth();

    return (
      <div
        className={isHorizontal
          ? "flex w-full flex-row justify-center gap-2.5"
          : "flex h-180 w-36 shrink-0 flex-col gap-2.5"}
      >
        {paddedUsers.map((discordId, index) => {
          const isEmpty = !discordId;
          const isMuted = !isEmpty && (mutedUsers[discordId] || false);
          const isSpeaking = !isEmpty && activeUserIds.has(discordId);
          const isUser = discordId === user!.id;
          const isFiltered = filteredUser === discordId;
          

          const itemClasses = isEmpty
            ? "border-slate-200 bg-slate-100/60 dark:border-slate-600/50 dark:bg-slate-800/30"
            : isMuted
            ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
            : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800";

          const buttonClasses = isMuted
            ? "border-red-400 bg-red-100 text-red-600 hover:bg-red-200 dark:border-red-500 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
            : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400 dark:hover:text-white";

          return (
            <div key={`player-${discordId || `empty-${index}`}`} className="flex items-center gap-2.5">
              <div
                className={`flex h-fit w-32 flex-col items-center gap-2 rounded-md border p-2.5 transition-colors ${itemClasses} ${
                  isFiltered ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""
                }`}
              >
                <div className="flex w-full items-center justify-center gap-2">
                  <div
                    onClick={() => !isEmpty && onFilteredUser(discordId)}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 transition-all ${
                      !isEmpty ? "cursor-pointer" : ""
                    } ${isSpeaking ? "ring-2 ring-[#23A55A]" : ""}`}
                  >
                    {isEmpty
                      ? <div className="text-xs text-slate-400 dark:text-slate-500">-</div>
                      : isUser
                        ? <img
                            src={`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png`}
                            alt="Avatar"
                            className="w-full h-full rounded-full object-cover"
                          />
                        : <User className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                    }
                  </div>
                  {!isEmpty && (
                    <button
                      type="button"
                      onClick={() => toggleMute(discordId)}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border transition-colors ${buttonClasses}`}
                      title={isMuted ? "Unmute player" : "Mute player"}
                    >
                      {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                  )}
                </div>
                {!isEmpty && (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volumes[discordId] ?? 1}
                    onChange={e => onVolumeChange(discordId, parseFloat(e.target.value))}
                    className="w-full h-1 accent-[#FACC15] cursor-pointer" // T yellow? maybe white?
                    title="Volume"
                  />
                )}
                <div className="w-full truncate rounded border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-center text-[11px] font-medium normal-case tracking-normal text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {isEmpty ? "-" : discordNames[discordId] || discordId}
                </div>
              </div>
              {isHorizontal && index === 4 && <div className="h-24 w-px bg-slate-300/70 dark:bg-slate-600/70" />}
            </div>
          );
        })}
      </div>
    );
  },
);