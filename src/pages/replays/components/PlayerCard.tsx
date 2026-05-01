import HPBar from "./HPBar";

export interface ReplayPlayer {
    team: number
    steamid: string
    name?: string
    hp: number
    alive: boolean
    weaponName?: string
    money?: number
    
}

interface PlayerCardProps {
    player: ReplayPlayer
    ringColor: string
    centerTextColorClass: string
    kda?: { kills: number; deaths: number; assists: number }
    money?: number
    weaponName?: string
}


export default function PlayerCard({
    player,
    kda,
    money,
    weaponName,
    ringColor,
    centerTextColorClass,
}: PlayerCardProps & {
    kda?: {kills: number; deaths: number; assists: number }
}) {
    return (
        <div
            className={`flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-white/90 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/70 ${
               player.alive ? "" : "opacity-55"
            }`}
        > 
            <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2">
                    <div
                        className="truncate text-sm font-mono font-medium text-slate-700 dark:text-slate-200"
                        style={{ maxWidth: "32ch" }}
                        title={player.name || player.steamid}
                    >
                        {player.name || player.steamid}
                    </div>
                    <div className="min-w-0 flex-1 text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                        {weaponName || "Main Weapon"}
                    </div>
                </div>

                <div className="mt-0.5 flex items-center gap-2">
                    <div className="text-xs font-mono text-slate-400">
                        {kda?.kills ?? 0}K / {kda?.deaths ?? 0}D / {kda?.assists ?? 0}A
                    </div>
                    <div className="min-w-0 flex-1 text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                        ${money ?? 0}
                    </div>
                </div>
            </div>

            <div className="ml-1 flex items-center">
                <HPBar
                hp={player.hp}
                alive={player.alive}
                ringColor={ringColor}
                centerTextColorClass={centerTextColorClass}
                />
            </div>
            </div>
    )
}

interface PlayerCardPlaceholderProps {
    ringColor: string
    centerTextColorClass: string
}

export function PlayerCardPlaceholder({
    ringColor,
}: PlayerCardPlaceholderProps) {
    return (
     <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-white/90 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/70 opacity-60 animate-pulse">
      
             <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2">
                        <div className="h-4 w-32 rounded bg-slate-300 dark:bg-slate-600" />
                        <div className="h-3 w-20 rounded bg-slate-300 dark:bg-slate-600" />
        </div>

                <div className="mt-0.5 flex items-center gap-2">
                        <div className="h-3 w-12 rounded bg-slate-300 dark:bg-slate-600" />
                        <div className="ml-auto h-3 w-14 rounded bg-slate-300 dark:bg-slate-600" />
        </div>
            </div>

      {/* Fake HP Ring */}
            <div className="ml-1 flex items-center">
        <div
          className="h-8 w-8 rounded-full border"
          style={{ borderColor: ringColor }}
        />
      </div>

    </div>
  )
}

