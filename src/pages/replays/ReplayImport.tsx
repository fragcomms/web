import { AlertTriangle, Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioItem } from "../../components/AudioItem";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { normalizeSharecode, validateSharecode } from "../../utils/sharecode";

type AudioRow = {
  audio_id: string;
  creation_time: string;
  sampling_rate: number;
};

type SubmitErrorState = {
  code?: string;
  title: string;
  details: string[];
};

function parseDetailLines(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") return JSON.stringify(item);
        return String(item);
      })
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${typeof item === "string" ? item : JSON.stringify(item)}`)
      .filter(Boolean);
  }

  return [];
}

function formatSubmitError(
  payload: unknown,
  status?: number,
  statusText?: string,
): SubmitErrorState {
  const fallbackTitle = status
    ? `Failed to process replay (${status}${statusText ? ` ${statusText}` : ""})`
    : "Failed to process replay";

  if (!payload) {
    return { title: fallbackTitle, details: [] };
  }

  if (typeof payload === "string") {
    return { title: payload, details: [] };
  }

  if (payload && typeof payload === "object") {
    const typedPayload = payload as {
      error?: unknown;
      message?: unknown;
      details?: unknown;
      errors?: unknown;
    };

    const title = (typeof typedPayload.error === "string" && typedPayload.error)
      || (typeof typedPayload.message === "string" && typedPayload.message)
      || fallbackTitle;

    const details = [
      ...parseDetailLines(typedPayload.details),
      ...parseDetailLines(typedPayload.errors),
    ];

    return { title, details };
  }

  return { title: fallbackTitle, details: [] };
}

export function AudioLibrary() {
  const navigate = useNavigate();

  // API-backed audio list and request state
  const [audioData, setAudioData] = useState<AudioRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [sharecode, setSharecode] = useState("");
  const [submitError, setSubmitError] = useState<SubmitErrorState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [showProcessConfirm, setShowProcessConfirm] = useState(false);

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
    const sharecodeResult = validateSharecode(sharecode);

    if (!selectedAudioId) {
      setSubmitError({
        title: "Please select an audio file and enter a sharecode.",
        details: [],
      });
      return;
    }

    if (!sharecodeResult.ok) {
      const details = sharecodeResult.error === "invalid_format"
        ? ["Expected format: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx (case-sensitive)"]
        : [];

      setSubmitError({
        code: sharecodeResult.error,
        title: sharecodeResult.error === "too_long"
          ? "Sharecode is too long."
          : sharecodeResult.error === "missing"
          ? "Please enter a match sharecode."
          : "Invalid match sharecode format.",
        details,
      });
      return;
    }

    setSubmitError(null);
    setShowProcessConfirm(false);
    setIsSubmitting(true);

    try {
      const normalizedSharecode = sharecodeResult.value;
      const replayName = `Replay ${normalizedSharecode}`;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/replays/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          audio_id: selectedAudioId,
          sharecode: normalizedSharecode,
          replay_name: replayName,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setSubmitError(formatSubmitError(payload, res.status, res.statusText));
        return;
      }

      const data = await res.json() as { job_id?: string; };
      if (!data.job_id) {
        setSubmitError({
          title: "Replay pipeline returned no job ID.",
          details: ["Please try again in a few moments."],
        });
        return;
      }

      navigate("/replays");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process replay";
      setSubmitError({ title: message, details: [] });
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredAudio = audioData.filter((audio) =>
    [audio.audio_id, audio.creation_time, String(audio.sampling_rate)]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const selectedAudio = selectedAudioId
    ? audioData.find((audio) => audio.audio_id === selectedAudioId) ?? null
    : null;

  function handleChooseDifferentAudio() {
    setSelectedAudioId(null);
    setSharecode("");
    setSubmitError(null);
    setShowProcessConfirm(false);
  }

  function openProcessConfirm() {
    const sharecodeResult = validateSharecode(sharecode);

    if (!selectedAudioId) {
      setSubmitError({
        title: "Please select an audio file and enter a sharecode.",
        details: [],
      });
      return;
    }

    if (!sharecodeResult.ok) {
      const details = sharecodeResult.error === "invalid_format"
        ? ["Expected format: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx (case-sensitive)"]
        : [];

      setSubmitError({
        code: sharecodeResult.error,
        title: sharecodeResult.error === "too_long"
          ? "Sharecode is too long."
          : sharecodeResult.error === "missing"
          ? "Please enter a match sharecode."
          : "Invalid match sharecode format.",
        details,
      });
      return;
    }

    setSubmitError(null);
    setShowProcessConfirm(true);
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
                {selectedAudioId ? "Match Code Entry" : "Audio Selection"}
              </h1>
            </div>
            <p className="text-lg md:text-xl text-[#cbd5e1] mt-6 mb-8 font-light">
              {selectedAudioId
                ? "Enter your match sharecode to create a replay with this audio."
                : "Choose an audio file you wish to process."}
            </p>
          </div>
        </div>

        {!selectedAudioId && (
          <>
            {/* Search and Filters */}
            <div className="mx-auto mb-6 flex w-2/3 items-center gap-4">
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
              {isLoading && <div className="text-gray-400">Loading audio files...</div>}

              {!isLoading && error && <div className="text-red-400">{error}</div>}

              {!isLoading && !error && filteredAudio.length === 0 && (
                <div className="text-gray-400">No audio files found.</div>
              )}

              {!isLoading && !error
                && filteredAudio.map((audio) => (
                  <div key={audio.audio_id} className="mx-auto w-2/3">
                    <AudioItem
                      audio={audio}
                      isSelected={selectedAudioId === audio.audio_id}
                      onClick={() => setSelectedAudioId(audio.audio_id)}
                    />
                  </div>
                ))}
            </div>
          </>
        )}

        {selectedAudioId && (
          <div className="mx-auto mt-8 w-2/3 space-y-3 rounded-lg border border-[#1e2936] bg-[#151d2b] p-4">
            {selectedAudio && (
              <div className="w-full">
                <AudioItem audio={selectedAudio} isSelected />
              </div>
            )}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleChooseDifferentAudio}>
                Choose Different Audio
              </Button>
            </div>
            <div className="w-full space-y-2">
              <h2 className="text-lg">Enter Match Sharecode:</h2>
              <Input
                value={sharecode}
                onChange={(event) => setSharecode(event.target.value)}
                onBlur={() => setSharecode((current) => normalizeSharecode(current))}
                placeholder="CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
                className="w-full bg-[#0e1622] border-[#1e2936] text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex justify-center">
              <div className="rounded-xl border border-[#253144] bg-[#0e1622] p-2">
                <Button
                  onClick={openProcessConfirm}
                  disabled={isSubmitting || !sharecode.trim()}
                >
                  {isSubmitting ? "Creating replay..." : "Create Replay"}
                </Button>
              </div>
            </div>
            {submitError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div className="space-y-1">
                    <p className="font-medium text-destructive">{submitError.title}</p>
                    {submitError.details.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-5 text-destructive/90">
                        {submitError.details.map((detail) => <li key={detail}>{detail}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showProcessConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                <Card className="w-full max-w-md border-slate-700 bg-slate-900 p-6">
                  <h2 className="text-lg font-semibold text-white">Confirm Replay Processing</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Starting replay processing can take a few minutes. Confirm to begin processing this selected audio
                    with the provided match sharecode.
                  </p>
                  <div className="mt-6 flex justify-center gap-2">
                    <Button
                      className="h-10 w-28 border border-transparent bg-white text-slate-900 hover:bg-slate-200"
                      onClick={() => setShowProcessConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-10 w-28 border border-transparent bg-[#5865F2] hover:bg-[#4752C4]"
                      onClick={handleProcessReplay}
                      disabled={isSubmitting}
                    >
                      Confirm
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
