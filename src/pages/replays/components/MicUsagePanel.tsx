import {memo, useMemo} from "react";
import type { TranscriptSegment } from "../ReplayMedia";


interface MicUsagePanelProps {
    transcripts: TranscriptSegment[];
    discordNames: Record<string, string>;
    discordUsers: string[];
}

export const MicUsagePanel = memo(function MicUsagePanel(
    { 
        transcripts, 
        discordNames, 
        discordUsers 
    }: MicUsagePanelProps, 
)
    {
        const stats = useMemo(() => {
            const speakingTime: Record<string, number> = {}; // string,number = userID, speakingTime

            // start all speaking times at 0
            for (const userID of discordUsers) {
                speakingTime[userID] = 0;
            }

            for (const segment of transcripts) {
                speakingTime[segment.discordId] = (speakingTime[segment.discordId] ?? 0) + (segment.end - segment.start) 
            }

            const total = Object.values(speakingTime).reduce((sum, t) => sum + t, 0);

            return discordUsers.map(userID => ({
                userID,
                name: discordNames[userID] ?? `User ID: ${userID}`,
                seconds: speakingTime[userID],
                speakingPercentage: total > 0 ? (speakingTime[userID] / total) * 100 : 0,
            }))
            .sort((a, b) => b.seconds - a.seconds);
        }, [transcripts, discordUsers, discordNames]);

        // change to mins secs format
        const formatDuration = (sec: number) => {
            const mins = Math.floor(sec / 60);
            const secs = Math.floor(sec % 60)
            return mins > 0 ? `${mins}m ${secs}` : `${secs}s`
        };

        return (
            <aside className="w-full max-w-72 rounded-xl border border-slate-700 bg-slate-900/90 p-3 flex flex-col gap-3">
                <div className="text-sm font-semibold text-slate-200">Mic Usage:</div>
                {stats.length === 0
                    ? <p className="text-slate-400 italic text-sm text-center">No data yet.</p>
                    : (
                    <div className="flex flex-col gap-2">
                        {stats.map(({ userID, name, seconds, speakingPercentage }) => (
                        <div key={userID} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs text-slate-300">
                            <span className="font-semibold text-blue-400 truncate max-w-36">{name}</span>
                            <span className="text-slate-400 font-mono">{formatDuration(seconds)} · {speakingPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${speakingPercentage}%` }}
                            />
                            </div>
                        </div>
                        ))}
                    </div>
                    )}
                </aside>
        );
    
    }
)
