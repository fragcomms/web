import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { ReplayPlayer } from "./components/PlayerCard";

interface ReplayStatsProps {
	replayId?: string;
	leftTeamPlayers: ReplayPlayer[];
	rightTeamPlayers: ReplayPlayer[];
}

type AdvancedStats = {
	rounds_played?: number;
	kills?: number;
	assists?: number;
	deaths?: number;
	hs_kills?: number;
	damage?: number;
	util_damage?: number;
	first_kills?: number;
	first_deaths?: number;
	kast_rounds?: number;
	"3k"?: number;
	"4k"?: number;
	"5k"?: number;
	kast_pct?: number;
	adr?: number;
	hs_pct?: number;
	util_adr?: number;
};

type PlayerStatsRow = {
	player_id: string;
	name: string | null;
	sid: string | null;
	team: number | null;
	advanced_stats: AdvancedStats | null;
};

type PlayerStatsResponse = {
	replay_id: string;
	player_count: number;
	players: PlayerStatsRow[];
};

const matchStatColumns = [
	"Player Name",
	"Kills",
	"Assists",
	"Deaths",
	"HS Kills",
	"Damage",
	"Util Damage",
	"First Kills",
	"First Deaths",
	"KAST Rounds",
	"3K",
	"4K",
	"5K",
	"KAST%",
	"ADR",
	"HS%",
	"Util ADR",
] as const;

const teamStatColumns = matchStatColumns.slice(1);
const TEAM_SIZE = 5;

type TeamSide = "left" | "right";
type MatchStatColumn = (typeof matchStatColumns)[number];

// Normalizes each team to a fixed 5-player layout so the table always renders
// the same number of rows, even when a slot is empty.
const toMatchRows = (teamPlayers: ReplayPlayer[]) =>
	Array.from({ length: TEAM_SIZE }, (_, i) => teamPlayers[i]);

// Maps each visible table column to the corresponding backend stat field.
const statKeyByColumn: Record<(typeof matchStatColumns)[number], keyof AdvancedStats | null> = {
	"Player Name": null,
	"Kills": "kills",
	"Assists": "assists",
	"Deaths": "deaths",
	"HS Kills": "hs_kills",
	"Damage": "damage",
	"Util Damage": "util_damage",
	"First Kills": "first_kills",
	"First Deaths": "first_deaths",
	"KAST Rounds": "kast_rounds",
	"3K": "3k",
	"4K": "4k",
	"5K": "5k",
	"KAST%": "kast_pct",
	"ADR": "adr",
	"HS%": "hs_pct",
	"Util ADR": "util_adr",
};

const statDescriptionByColumn: Record<(typeof matchStatColumns)[number], string> = {
	"Player Name": "Player display name or Steam ID when the name is unavailable.",
	"Kills": "Total enemy kills recorded in the match.",
	"Assists": "Kills where this player assisted a teammate.",
	"Deaths": "Total times the player died.",
	"HS Kills": "Kills secured specifically with headshots.",
	"Damage": "Total damage dealt to opponents across all rounds.",
	"Util Damage": "Damage dealt using utility such as grenades and molotovs.",
	"First Kills": "Opening kills where this player got the first frag in a round.",
	"First Deaths": "Rounds where this player was the first to die.",
	"KAST Rounds": "Number of rounds where the player had KAST impact.",
	"3K": "Rounds with exactly 3 kills by this player.",
	"4K": "Rounds with exactly 4 kills by this player.",
	"5K": "Rounds with 5 kills by this player (ace).",
	"KAST%": "Percent of rounds with Kill, Assist, Survived, or Traded.",
	"ADR": "Average damage dealt per round.",
	"HS%": "Percentage of kills that were headshots.",
	"Util ADR": "Average utility damage dealt per round.",
};

export default function ReplayStats({
	replayId,
	leftTeamPlayers,
	rightTeamPlayers,
}: ReplayStatsProps) {
	const [statsBySid, setStatsBySid] = useState<Record<string, AdvancedStats>>({});
	const [activeTooltip, setActiveTooltip] = useState<{
		column: MatchStatColumn;
		x: number;
		y: number;
	} | null>(null);

	const showTooltipFor = (column: MatchStatColumn, target: HTMLElement) => {
		const rect = target.getBoundingClientRect();
		setActiveTooltip({
			column,
			x: rect.left + rect.width / 2,
			y: rect.top - 8,
		});
	};

	// Fetch the player stat payload whenever the replay changes, then index it by
	// Steam ID so cells can look up values quickly during render.
	useEffect(() => {
		let isCancelled = false;

		async function loadPlayerStats() {
			if (!replayId) {
				setStatsBySid({});
				return;
			}

			try {
				const res = await fetch(`${import.meta.env.VITE_API_URL}/replays/${replayId}/player-stats`, {
					credentials: "include",
				});

				if (!res.ok) {
					if (!isCancelled) setStatsBySid({});
					return;
				}

				const data = (await res.json()) as PlayerStatsResponse;
				if (isCancelled) return;

				const nextStatsBySid: Record<string, AdvancedStats> = {};
				for (const player of data.players ?? []) {
					if (!player.sid) continue;
					nextStatsBySid[player.sid] = player.advanced_stats ?? {};
				}

				setStatsBySid(nextStatsBySid);
			} catch {
				if (!isCancelled) setStatsBySid({});
			}
		}

		void loadPlayerStats();

		return () => {
			isCancelled = true;
		};
	}, [replayId]);

	const leftTeamMatchRows = useMemo(
		() => toMatchRows(leftTeamPlayers),
		[leftTeamPlayers]
	);
	const rightTeamMatchRows = useMemo(
		() => toMatchRows(rightTeamPlayers),
		[rightTeamPlayers]
	);

	const renderStatCell = (player: ReplayPlayer | undefined, column: (typeof matchStatColumns)[number]) => {
		const statKey = statKeyByColumn[column];
		if (!statKey || !player?.steamid) return "--";

		const playerStats = statsBySid[player.steamid];
		if (!playerStats) return "--";

		const value = playerStats[statKey];
		// Keep missing or zero-like values readable in the table.
		return value ?? "--";
	};

	const renderTeamRows = (players: Array<ReplayPlayer | undefined>, side: TeamSide) => {
		const teamTextClass = side === "left" ? "text-blue-300" : "text-yellow-300";
		const fallbackPrefix = side === "left" ? "CT" : "T";
		const rowKeyPrefix = side === "left" ? "left-team-stats" : "right-team-stats";
		const cellKeyPrefix = side === "left" ? "left" : "right";

		return players.map((player, index) => (
			<tr key={`${rowKeyPrefix}-${player?.steamid ?? index}`} className="border-t border-slate-700/70">
				<td className={`px-3 py-2 whitespace-nowrap font-medium ${teamTextClass}`}>
					{player?.name || player?.steamid || `${fallbackPrefix} Player ${index + 1}`}
				</td>
				{teamStatColumns.map((column) => (
					<td key={`${cellKeyPrefix}-${index}-${column}`} className="px-3 py-2 whitespace-nowrap text-slate-400">
						{renderStatCell(player, column)}
					</td>
				))}
			</tr>
		));
	};

	return (
		<div className="w-full border-t border-slate-700 mt-6 pt-4 pb-6 text-white text-sm">
			<div className="max-w-[95vw] mx-auto mt-6 px-4">
				{/* The section title keeps the stats table easy to identify in the replay view. */}
				<div className="mb-2 text-center text-2xl font-semibold tracking-wide text-slate-200">
					Match Stats
				</div>
				{/* Horizontal scrolling preserves all stat columns on smaller screens. */}
				<div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/60">
					<table className="min-w-max w-full text-xs text-slate-200">
						{/* Column headers stay fixed at the top of the table. */}
						<thead className="bg-slate-800/80 text-slate-100">
							<tr>
								{matchStatColumns.map((column) => (
									<th key={column} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
										<span className="inline-flex items-center gap-1.5">
											{column}
											<span
												className="inline-flex h-4 w-4 cursor-help select-none items-center justify-center text-slate-300 hover:text-white"
												aria-label={`${column} info`}
												tabIndex={0}
												onMouseEnter={(event) => showTooltipFor(column, event.currentTarget)}
												onMouseMove={(event) => showTooltipFor(column, event.currentTarget)}
												onMouseLeave={() => setActiveTooltip(null)}
												onFocus={(event) => showTooltipFor(column, event.currentTarget)}
												onBlur={() => setActiveTooltip(null)}
											>
												<Info className="h-3.5 w-3.5" aria-hidden="true" />
											</span>
										</span>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{/* Render the left team, then a spacer row, then the right team. */}
							{renderTeamRows(leftTeamMatchRows, "left")}

							<tr className="bg-slate-800/50">
								<td colSpan={matchStatColumns.length} className="px-3 py-1 border-y border-slate-600" aria-hidden="true">
									&nbsp;
								</td>
							</tr>

							{renderTeamRows(rightTeamMatchRows, "right")}
						</tbody>
					</table>
				</div>
				{activeTooltip ? (
					<div
						className="pointer-events-none fixed z-50 flex max-w-64 -translate-x-1/2 -translate-y-full items-start rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-slate-100 shadow-lg"
						style={{ left: activeTooltip.x, top: activeTooltip.y }}
						role="tooltip"
					>
						{statDescriptionByColumn[activeTooltip.column]}
					</div>
				) : null}
			</div>
		</div>
	);
}
