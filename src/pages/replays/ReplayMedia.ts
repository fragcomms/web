import { useCallback, useEffect, useState } from "react";
import { AudioSyncPlayer } from "../../utils/media/AudioSyncPlayer";

export interface TranscriptSegment {
  discordId: string;
  start: number;
  end: number;
  text: string;
  clean_text: string;
}

type ReplayMediaMetadata = {
  audio_id: string | null;
  audio_offset: number | null;
  audio_starts_first: boolean | null;
};

export function useReplayMedia(id: string | undefined, audioPlayerRef: React.RefObject<AudioSyncPlayer | null>) {
  const [transcriptText, setTranscriptText] = useState("Loading transcript...");
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [discordUsers, setDiscordUsers] = useState<string[]>([]);
  const [discordNames, setDiscordNames] = useState<Record<string, string>>({});
  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [audioStartOffsetSec, setAudioStartOffsetSec] = useState(0);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [audioSyncWarning, setAudioSyncWarning] = useState<string | null>(null);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [filteredUser, setFilteredUser] = useState<string | null>(null);

  const handleFilteredUser = useCallback((discordId: string) => {
    setFilteredUser(prev => prev === discordId ? null : discordId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // master function to initialize audio and transcripts
    async function initializeMedia() {
      if (!id) return;
      try {
        const replayRes = await fetch(`${import.meta.env.VITE_API_URL}/replays/${id}`, { credentials: "include" });
        if (!replayRes.ok) throw new Error("Metadata fetch failed");

        const replayMetadata = (await replayRes.json()) as ReplayMediaMetadata;
        const audioId = replayMetadata.audio_id;
        if (!audioId) return setTranscriptText("No audio linked to this replay.");
        setAudioId(audioId);

        let localOffsetSec = 0;
        let localStartsFirst = replayMetadata.audio_starts_first ?? true;

        const offsetMs = replayMetadata.audio_offset;
        if (typeof offsetMs === "number" && Number.isFinite(offsetMs)) {
          if (offsetMs < 0) {
            // setAudioStartOffsetSec(0);
            setAudioSyncWarning("Audio timestamp is after the demo window; playback sync is disabled for this replay.");
          } else {
            localOffsetSec = offsetMs / 1000;
            setAudioSyncWarning(null);
          }
        } else {
          // setAudioStartOffsetSec(0);
          setAudioSyncWarning(null);
        }

        setAudioStartOffsetSec(localOffsetSec);

        const transcriptRes = await fetch(`${import.meta.env.VITE_API_URL}/audio/${audioId}/transcriptions`, {
          credentials: "include",
        });
        const transcriptJson = await transcriptRes.json();
        const uniqueIds = Object.keys(transcriptJson);

        if (uniqueIds.length === 0) return setTranscriptText("No transcripts generated yet.");

        const combined: TranscriptSegment[] = [];
        // Combine all transcripts into one array and sort by start time
        // makes it easier to display in the transcript panel & ensures audio tracks are properly loaded for all users mentioned in the transcripts
        for (const [discordId, segments] of Object.entries(transcriptJson)) {
          for (const seg of (segments as any[])) {
            combined.push({
              discordId,
              start: seg.start,
              end: seg.end,
              text: seg.raw_text || seg.text,
              clean_text: seg.clean_text,
            });
          }
        }

        // If the component is still mounted, update state with transcripts and user info
        if (!cancelled) {
          setTranscripts(combined.sort((a, b) => a.start - b.start));
          setDiscordUsers(uniqueIds);
          setMutedUsers(uniqueIds.reduce((acc, uid) => ({ ...acc, [uid]: false }), {}));
          setTranscriptText("");
        }

        const fetchAudio = async () => {
          if (!audioPlayerRef.current) return;
          await audioPlayerRef.current.loadTracks(
            audioId, 
            uniqueIds, 
            import.meta.env.VITE_API_URL,
            localOffsetSec,
            localStartsFirst,
          );
          if (!cancelled) {
            setAudioDurationSec(audioPlayerRef.current.getLongestTrackDurationSeconds());
          }
        };

        const fetchNames = async () => {
          const mapping: Record<string, string> = {};
          await Promise.all(uniqueIds.map(async (uid) => {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/user/${uid}`, { credentials: "include" });
              if (res.ok) mapping[uid] = (await res.json()).username;
            } catch (e) {
              mapping[uid] = uid;
            }
          }));
          if (!cancelled) setDiscordNames(mapping);
        };

        await Promise.all([fetchAudio(), fetchNames()]);
      } catch (e) {
        if (!cancelled) setTranscriptText("Failed to load media.");
        console.log("Failed to load media: ", e);
      }
    }

    void initializeMedia();
    return () => {
      cancelled = true;
    };
  }, [id, audioPlayerRef]);

  const toggleMute = useCallback((discordId: string) => {
    setMutedUsers(prev => {
      const muted = !prev[discordId];
      if (audioPlayerRef.current) audioPlayerRef.current.setTrackMute(discordId, muted);
      return { ...prev, [discordId]: muted };
    });
  }, [audioPlayerRef]);

  return {
    transcriptText,
    transcripts,
    discordUsers,
    discordNames,
    mutedUsers,
    filteredUser,
    handleFilteredUser,
    toggleMute,
    audioStartOffsetSec,
    audioDurationSec,
    audioSyncWarning,
    audioId,
  };
}
