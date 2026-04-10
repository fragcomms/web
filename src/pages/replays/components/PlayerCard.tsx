import HPBar from "./HPBar";

export interface ReplayPlayer {
    team: number
    steamid: string
    name?: string
    hp: number
    alive: boolean
    
}

interface PlayerCardProps {
    player: ReplayPlayer
    ringColor: string
    centerTextColorClass: string
}


export default function PlayerCard({
    player,
    kda,
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
            {/* name */}
            <div
                className="min-w-0 truncate pr-2 text-sm font-mono font-medium text-slate-700 dark:text-slate-200"
                style={{ maxWidth: "32ch" }}
                title={player.name || player.steamid}
            >
                {player.name || player.steamid}
            </div>

            {/* KDA */}
            <div className="text-xs font-mono text-slate-400">
                {kda?.kills ?? 0} / {kda?.deaths ?? 0} / {kda?.assists ?? 0}
            </div>

            <div className="flex items-center">
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
      
       {/* player name placeholder */}
        <div className="flex-1 pr-2 animate-pulse">
            <div className="h-4 w-full rounded bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* KDA placeholder */}
        <div className="w-12 animate-pulse">
            <div className="h-3 w-full rounded bg-slate-300 dark:bg-slate-600" />
        </div>

      {/* Fake HP Ring */}
      <div className="flex items-center">
        <div
          className="h-8 w-8 rounded-full border"
          style={{ borderColor: ringColor }}
        />
      </div>

    </div>
  )
}

