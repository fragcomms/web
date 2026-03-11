import { Mic, MicOff, User } from "lucide-react";
import { memo } from "react";

interface MuteSidebarProps {
  discordUsers: string[];
  mutedUsers: Record<string, boolean>;
  discordNames: Record<string, string>;
  toggleMute: (discordId: string) => void;
}

export const MuteSidebar = memo(
  function MuteSidebar({ discordUsers, mutedUsers, discordNames, toggleMute }: MuteSidebarProps) {
    return (
      <div className="flex h-[720px] w-36 shrink-0 flex-col gap-2.5">
        {discordUsers.map((discordId, index) => {
          const isMuted = mutedUsers[discordId] || false;
          return (
            <div key={`player-icon-${discordId}`} className="contents">
              <div
                className={`flex w-full flex-col items-center gap-2 rounded-md border p-2.5 transition-colors ${
                  isMuted ? "border-red-900/50 bg-red-950/20" : "border-slate-700 bg-slate-800"
                }`}
              >
                <div className="flex w-full items-center justify-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700">
                    <User className="h-6 w-6 text-slate-300" />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMute(discordId)}
                    className={`flex h-10 w-10 items-center justify-center rounded border transition-colors ${
                      isMuted
                        ? "border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400 hover:text-white"
                    }`}
                    title={isMuted ? "Unmute player" : "Mute player"}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
                <div className="w-full truncate rounded border border-slate-600 bg-slate-900 px-2.5 py-0.5 text-center text-[11px] uppercase tracking-wide text-slate-300">
                  {discordNames[discordId] || discordId}
                </div>
              </div>
              {index === 4 && discordUsers[5] && <div className="my-0.5 h-px w-full bg-slate-600/70" />}
            </div>
          );
        })}
      </div>
    );
  },
);
