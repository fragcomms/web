export async function downloadAudio(
  discordUsers: string[],
  discordNames: Record<string, string>,
  audioId: string,
  apiUrl: string,
  replayId?: string,
): Promise<void> {
  await Promise.all(discordUsers.map(async (uid) => {
    const res = await fetch(`${apiUrl}/audio/${audioId}/track/${uid}/download`, {
      credentials: "include",
    });
    if (!res.ok) return;


    // grab blob and create download link
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${discordNames[uid] ?? uid}_${replayId ?? "replay"}.mka`;
    a.click();
    URL.revokeObjectURL(url);
  }));
}