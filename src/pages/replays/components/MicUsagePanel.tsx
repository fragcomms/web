import { memo, useMemo } from "react";
import type { TranscriptSegment } from "../ReplayMedia";

const COLORS = ["#3399FF", "#FACC15", "#10B981", "#EF4444", "#8B5CF6", "#EC4889"];
const MAX_USERS = 6;

interface MicUsagePanelProps {
    transcripts: TranscriptSegment[];
    discordNames: Record<string, string>;
    discordUsers: string[];
}

export const MicUsagePanel = memo(function MicUsagePanel(
    { transcripts, discordNames, discordUsers }: MicUsagePanelProps,
) {
    const stats = useMemo(() => {
        const speakingTime: Record<string, number> = {};
        for (const userID of discordUsers) {
            speakingTime[userID] = 0;
        }
        for (const segment of transcripts) {
            speakingTime[segment.discordId] = (speakingTime[segment.discordId] ?? 0) + (segment.end - segment.start);
        }
        const total = Object.values(speakingTime).reduce((sum, t) => sum + t, 0);

        const real = discordUsers.map((userID, i) => ({
            userID,
            name: discordNames[userID] ?? `User ${i + 1}`,
            seconds: speakingTime[userID],
            speakingPercentage: total > 0 ? (speakingTime[userID] / total) * 100 : 0,
        })).sort((a, b) => b.seconds - a.seconds);

        const fillers = Array.from({ length: MAX_USERS - real.length }, (_, i) => ({
            userID: `empty-${i}`,
            name: `User ${real.length + i + 1}`,
            seconds: 0,
            speakingPercentage: 0,
        }));

        return [...real, ...fillers];
    }, [transcripts, discordUsers, discordNames]);

    const formatDuration = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = Math.floor(sec % 60);
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const isFiller = (userID: string) => userID.startsWith("empty-");

    const getUserNameClassName = (userID: string) =>
        isFiller(userID) ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-[#E6EDF7]";

    const getUserStatsClassName = (userID: string) =>
        isFiller(userID) ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400";

    return (
        <section className="w-full rounded-xl border border-slate-300 bg-white/90 p-4 flex flex-col gap-4 dark:border-slate-700 dark:bg-slate-900/90">
            <div className="text-2xl font-semibold text-blue-700 dark:text-blue-400 text-center">Mic Usage</div>
            <div className="flex gap-6">

                {/* Bar Chart */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="text-xs font-medium text-center" style={{ color: "#FACC15" }}>Bar Chart</div>
                    {stats.map(({ userID, name, seconds, speakingPercentage }) => (
                        <div key={userID} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                                <span
                                    className={`font-semibold truncate max-w-36 ${getUserNameClassName(userID)}`}
                                >
                                    {name}
                                </span>
                                <span className={`font-mono ${getUserStatsClassName(userID)}`}>
                                    {formatDuration(seconds)} · {speakingPercentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                    className="h-full transition-all duration-500"
                                    style={{
                                        width: `${speakingPercentage}%`,
                                        backgroundColor: isFiller(userID) ? "#334155" : "#84CC16",
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

                {/* Pie Chart */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="text-xs font-medium text-center" style={{ color: "#FACC15" }}>Pie Chart</div>
                    <div className="grid grid-cols-5 items-center w-full">
                        {/* column 1 empty */}
                        <div />
                        {/* column 2 pie chart */}
                        <div className="col-span-3 flex justify-center pt-2">
                            <svg viewBox="-1 -1 2 2" className="w-60 h-60 shrink-0 -rotate-90">
                                {(() => {
                                    let cumulative = 0;
                                    return stats.map(({ userID, speakingPercentage }, i) => {
                                        const pct = speakingPercentage / 100;
                                        if (pct === 0) return null;
                                        const x1 = Math.cos(2 * Math.PI * cumulative);
                                        const y1 = Math.sin(2 * Math.PI * cumulative);
                                        cumulative += pct;
                                        const x2 = Math.cos(2 * Math.PI * cumulative);
                                        const y2 = Math.sin(2 * Math.PI * cumulative);
                                        const largeArc = pct > 0.5 ? 1 : 0;
                                        return (
                                            <path
                                                key={userID}
                                                d={`M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                fill={COLORS[i % COLORS.length]}
                                            />
                                        );
                                    });
                                })()}
                                {stats.every(s => s.speakingPercentage === 0) && (
                                    <circle cx="0" cy="0" r="1" className="fill-slate-300 dark:fill-slate-800" />
                                )}
                            </svg>
                        </div>
                        {/* column 5 legend */}
                        <div className="flex flex-col gap-2">
                            {stats.map(({ userID, name, speakingPercentage }, i) => (
                                <div key={userID} className="flex items-center gap-1.5 text-xs">
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <div className="flex flex-col">
                                        <span className={`truncate max-w-24 ${getUserNameClassName(userID)}`}>
                                            {name}
                                        </span>
                                        <span className={`font-mono ${getUserStatsClassName(userID)}`}>
                                            {speakingPercentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
});