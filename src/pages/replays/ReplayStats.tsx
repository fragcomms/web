import { useEffect, useMemo, useState } from "react";
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
	"player_name",
	"kills",
	"assists",
	"deaths",
	"headshot_kills",
	"damage",
	"util_damage",
	"first_kills",
	"first_deaths",
	"KAST rounds",
	"3k",
	"4k",
	"5k",
	"kast_pct",
	"adr",
	"hs_pct",
	"util_adr",
] as const;

const statKeyByColumn: Record<(typeof matchStatColumns)[number], keyof AdvancedStats | null> = {
	player_name: null,
	kills: "kills",
	assists: "assists",
	deaths: "deaths",
	headshot_kills: "hs_kills",
	damage: "damage",
	util_damage: "util_damage",
	first_kills: "first_kills",
	first_deaths: "first_deaths",
	"KAST rounds": "kast_rounds",
	"3k": "3k",
	"4k": "4k",
	"5k": "5k",
	kast_pct: "kast_pct",
	adr: "adr",
	hs_pct: "hs_pct",
	util_adr: "util_adr",
};

export default function ReplayStats({
	replayId,
	leftTeamPlayers,
	rightTeamPlayers,
}: ReplayStatsProps) {
	const [statsBySid, setStatsBySid] = useState<Record<string, AdvancedStats>>({});

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
					if (!player.sid || !player.advanced_stats) continue;
					nextStatsBySid[player.sid] = player.advanced_stats;
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
		() => Array.from({ length: 5 }, (_, i) => leftTeamPlayers[i]),
		[leftTeamPlayers]
	);
	const rightTeamMatchRows = useMemo(
		() => Array.from({ length: 5 }, (_, i) => rightTeamPlayers[i]),
		[rightTeamPlayers]
	);

	const renderStatCell = (player: ReplayPlayer | undefined, column: (typeof matchStatColumns)[number]) => {
		const statKey = statKeyByColumn[column];
		if (!statKey || !player?.steamid) return "--";

		const playerStats = statsBySid[player.steamid];
		if (!playerStats) return "--";

		const value = playerStats[statKey];
		return value ?? "--";
	};

	return (
		<div className="w-full border-t border-slate-700 mt-6 pt-4 pb-6 text-white text-sm">
			<div className="max-w-[95vw] mx-auto mt-6 px-4">
				<div className="mb-2 text-center text-base font-semibold tracking-wide text-slate-200">
					Match Stats
				</div>
				<div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/60">
					<table className="min-w-max w-full text-xs text-slate-200">
						<thead className="bg-slate-800/80 text-slate-100">
							<tr>
								{matchStatColumns.map((column) => (
									<th key={column} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{leftTeamMatchRows.map((player, index) => (
								<tr key={`left-team-stats-${player?.steamid ?? index}`} className="border-t border-slate-700/70">
									<td className="px-3 py-2 whitespace-nowrap text-blue-300 font-medium">
										{player?.name || player?.steamid || `CT Player ${index + 1}`}
									</td>
									{matchStatColumns.slice(1).map((column) => (
										<td key={`left-${index}-${column}`} className="px-3 py-2 whitespace-nowrap text-slate-400">
											{renderStatCell(player, column)}
										</td>
									))}
								</tr>
							))}

							<tr className="bg-slate-800/50">
								<td colSpan={matchStatColumns.length} className="px-3 py-1 border-y border-slate-600" aria-hidden="true">
									&nbsp;
								</td>
							</tr>

							{rightTeamMatchRows.map((player, index) => (
								<tr key={`right-team-stats-${player?.steamid ?? index}`} className="border-t border-slate-700/70">
									<td className="px-3 py-2 whitespace-nowrap text-yellow-300 font-medium">
										{player?.name || player?.steamid || `T Player ${index + 1}`}
									</td>
									{matchStatColumns.slice(1).map((column) => (
										<td key={`right-${index}-${column}`} className="px-3 py-2 whitespace-nowrap text-slate-400">
											{renderStatCell(player, column)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
