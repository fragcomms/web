import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Search } from "lucide-react";
import { AudioItem } from "../../components/AudioItem";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

type AudioRow = {
  audio_id: string;
  creation_time: string;
  sampling_rate: number;
};

export function AudioLibrary() {
  const navigate = useNavigate();

  // API-backed audio list and request state
  const [audioData, setAudioData] = useState<AudioRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [sharecode, setSharecode] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Load user-visible audio options once on page load
    async function fetchAudio() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/audio`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        }

        const data: AudioRow[] = await res.json();
        setAudioData(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAudio();
  }, []);

  async function handleProcessReplay() {
    if (!selectedAudioId || !sharecode.trim()) {
      setSubmitError("Please select an audio file and enter a sharecode.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/replays/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          audio_id: selectedAudioId,
          sharecode: sharecode.trim(),
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;

        throw new Error(
          payload?.error || payload?.details || "Failed to process replay",
        );
      }

      navigate("/replays");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process replay";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredAudio = audioData.filter((audio) =>
    [audio.audio_id, audio.creation_time, String(audio.sampling_rate)]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const selectedAudio = selectedAudioId
    ? audioData.find((audio) => audio.audio_id === selectedAudioId) ?? null
    : null;

  function handleChooseDifferentAudio() {
    setSelectedAudioId(null);
    setSharecode("");
    setSubmitError(null);
  }

  return (
    <div className="min-h-screen text-white">

        {/* Main Content */}
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-center text-center">
          <div className="w-full">
            <div className="mb-4">
              <h1 className="text-4xl md:text-6xl font-bold bg-linear-to-r from-white via-[#e0e7ff] to-[#60a5fa] bg-clip-text text-transparent pb-4">
                {selectedAudioId ? "Create Replay" : "Select Audio to Process"}
              </h1>
            </div>
            <p className="text-lg md:text-xl text-[#cbd5e1] mt-6 mb-8 font-light">
              {selectedAudioId
                ? "Enter your match sharecode to create a replay with this audio"
                : "Choose an audio file you want to process"}
            </p>
          </div>
        </div>

        {!selectedAudioId && (
          <>
            {/* Search and Filters */}
            <div className="mb-6 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search recordings..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="bg-[#151d2b] border-[#1e2936] pl-10 text-white placeholder:text-gray-500"
                />
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Audio List */}
            <div className="space-y-4">
              {/* Loading/error/empty states are mutually exclusive */}
              {isLoading && (
                <div className="text-gray-400">Loading audio files...</div>
              )}

              {!isLoading && error && (
                <div className="text-red-400">{error}</div>
              )}

              {!isLoading && !error && filteredAudio.length === 0 && (
                <div className="text-gray-400">No audio files found.</div>
              )}

              {!isLoading && !error &&
                filteredAudio.map((audio) => (
                  <AudioItem
                    key={audio.audio_id}
                    audio={audio}
                    isSelected={selectedAudioId === audio.audio_id}
                    onClick={() => setSelectedAudioId(audio.audio_id)}
                  />
                ))}
            </div>
          </>
        )}

        {selectedAudioId && (
          <div className="mt-8 space-y-3 rounded-lg border border-[#1e2936] bg-[#151d2b] p-4">
            {selectedAudio && <AudioItem audio={selectedAudio} isSelected />}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleChooseDifferentAudio}>
                Choose Different Audio
              </Button>
            </div>
            <h2 className="text-lg">Enter Match Sharecode</h2>
            <Input
              value={sharecode}
              onChange={(event) => setSharecode(event.target.value)}
              placeholder="CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
              className="bg-[#0e1622] border-[#1e2936] text-white placeholder:text-gray-500"
            />
            <div className="flex justify-center">
              <div className="rounded-xl border border-[#253144] bg-[#0e1622] p-2">
                <Button
                  onClick={handleProcessReplay}
                  disabled={isSubmitting || !sharecode.trim()}
                >
                  {isSubmitting ? "Creating replay..." : "Create Replay"}
                </Button>
              </div>
            </div>
            {submitError && <div className="text-red-400 text-sm">{submitError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
