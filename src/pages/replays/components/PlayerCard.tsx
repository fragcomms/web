import HPBarUpdate from "./HPBar";

interface ReplayPlayer {
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
    ringColor,
    centerTextColorClass,
}: PlayerCardProps) {
    return (
        <div
            className={`flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-white/90 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/70 ${
               player.alive ? "" : "opacity-55"
            }`}
        > 
            <div
                className="min-w-0 truncate pr-2 text-sm font-mono font-medium text-slate-700 dark:text-slate-200"
                style={{ maxWidth: "32ch" }}
                title={player.name || player.steamid}
            >
                {player.name || player.steamid}
            </div>

            <div className="flex items-center">
                <HPBarUpdate
                hp={player.hp}
                alive={player.alive}
                ringColor={ringColor}
                centerTextColorClass={centerTextColorClass}
                />
            </div>
            </div>
    )
}
        