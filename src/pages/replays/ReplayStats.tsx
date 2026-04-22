import { useMemo } from "react";
import type { ReplayPlayer } from "./components/PlayerCard";

interface ReplayStatsProps {
	leftTeamName: string;
	rightTeamName: string;
	leftScore: number;
	rightScore: number;
	leftTeamPlayers: ReplayPlayer[];
	rightTeamPlayers: ReplayPlayer[];
}

const matchStatColumns = [
	"player_name",
	"rounds_played",
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

export default function ReplayStats({
	leftTeamName,
	rightTeamName,
	leftScore,
	rightScore,
	leftTeamPlayers,
	rightTeamPlayers,
}: ReplayStatsProps) {
	const leftTeamMatchRows = useMemo(
		() => Array.from({ length: 5 }, (_, i) => leftTeamPlayers[i]),
		[leftTeamPlayers]
	);
	const rightTeamMatchRows = useMemo(
		() => Array.from({ length: 5 }, (_, i) => rightTeamPlayers[i]),
		[rightTeamPlayers]
	);

	return (
		<div className="w-full border-t border-slate-700 mt-6 pt-4 pb-6 text-white text-sm">
			<div className="max-w-300 mx-auto flex justify-center gap-16 px-6">
				<div className="text-center">
					<div className="text-blue-400 font-semibold">{leftTeamName}</div>
					<div className="text-blue-300 text-2xl font-semibold">{leftScore}</div>
				</div>
				<div className="text-center">
					<div className="text-yellow-400 font-semibold">{rightTeamName}</div>
					<div className="text-yellow-300 text-2xl font-semibold">{rightScore}</div>
				</div>
			</div>

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
											--
										</td>
									))}
								</tr>
							))}

							<tr className="bg-slate-800/50">
								<td colSpan={matchStatColumns.length} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border-y border-slate-600">
									Team Separator
								</td>
							</tr>

							{rightTeamMatchRows.map((player, index) => (
								<tr key={`right-team-stats-${player?.steamid ?? index}`} className="border-t border-slate-700/70">
									<td className="px-3 py-2 whitespace-nowrap text-yellow-300 font-medium">
										{player?.name || player?.steamid || `T Player ${index + 1}`}
									</td>
									{matchStatColumns.slice(1).map((column) => (
										<td key={`right-${index}-${column}`} className="px-3 py-2 whitespace-nowrap text-slate-400">
											--
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
