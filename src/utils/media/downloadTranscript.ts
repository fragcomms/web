import type { TranscriptSegment } from "../../pages/replays/ReplayMedia";


// timestamp format: [HH:MM:SS] or [MM:SS]
function formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);


    return hours > 0
        ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        : `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

}

// download function
export function downloadTranscript(
    transcripts: TranscriptSegment[],
    discordNames: Record<string, string>,
    replayID?: string,
): void {
    if (transcripts.length === 0) return;

    const lines = transcripts.map((segment) => {

        // format: timestamp, speaker, text
        const timestamp = formatTimestamp(segment.start);
        const speaker = discordNames[segment.discordId] ?? segment.discordId;
        return `[${timestamp}] ${speaker}: ${segment.clean_text}`;
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript_${replayID ?? "replay"}_${Date.now()}.txt`; // probably turn date.now into dd-mm-yyyy format or something later?
    a.click();
    URL.revokeObjectURL(url);

}