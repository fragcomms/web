export async function downloadAudio(
  audioId: string,
  apiUrl: string,
  replayId?: string,
): Promise<void> {
  try {
    const res = await fetch(`${apiUrl}/audio/${audioId}/download`, {
      credentials: "include",
    });

    if (!res.ok) {
      console.error(`Failed to download master audio. Status: ${res.status}`);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    
    a.href = url;
    a.download = `match_${replayId ?? audioId}_full.mka`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error triggering audio download:", error);
  }
}