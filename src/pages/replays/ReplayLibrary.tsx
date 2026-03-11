import { Play, Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

// match exactly with replay list API
interface Replay {
  replay_id: number;
  name: string | null;
  fetch_time: string;
}

export function ReplayLibrary() {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReplays() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/replays`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          // Debugging: Check the console to see the real field names!
          console.log("Fetched Replays:", data);
          setReplays(data);
        }
      } catch (error) {
        console.error("Failed to load replays", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReplays();
  }, []);

  function openImportConfirm() {
    setShowImportConfirm(true);
  }

  function closeImportConfirm() {
    setShowImportConfirm(false);
  }

  function confirmImportNavigation() {
    setShowImportConfirm(false);
    navigate("/replays/import");
  }

  async function handleDeleteReplay(replayId: number) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/replays/${replayId}/delete`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setReplays((current) => current.filter((replay) => replay.replay_id !== replayId));
      } else {
        console.error(`Failed to delete replay ${replayId}`);
      }
    } catch (error) {
      console.error("Failed to delete replay", error);
    }
  }

  if (isLoading) {
    return <div className="text-white text-center mt-10">Loading replays...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Replay Library</h1>
          <p className="text-slate-400 text-sm">Browse and manage your replays.</p>
        </div>
        <Button
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors"
          onClick={openImportConfirm}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Replay
        </Button>
      </div>

      {replays.length === 0
        ? (
          <div className="text-slate-400 text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <p className="mb-4">No replays found.</p>
            <Button
              variant="outline"
              className="text-slate-300 border-slate-600 hover:text-white"
              onClick={openImportConfirm}
            >
              Upload your first match!
            </Button>
          </div>
        )
        : (
          <div className="flex flex-col gap-3">
            {[...replays]
              .sort((a, b) => b.replay_id - a.replay_id)
              .map((replay) => (
                <ReplayCard
                  key={replay.replay_id}
                  replay={replay}
                  onDelete={handleDeleteReplay}
                />
              ))}
          </div>
        )}

      {showImportConfirm
        ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <Card className="w-full max-w-md border-slate-700 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-white">Placeholder Warning Title</h2>
              <p className="mt-2 text-sm text-slate-300">
                Placeholder warning copy: this is where you can describe what users should confirm before continuing to
                the replay import page.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <Button
                  className="h-10 w-28 border border-transparent bg-white text-slate-900 hover:bg-slate-200"
                  onClick={closeImportConfirm}
                >
                  Cancel
                </Button>
                <Button
                  className="h-10 w-28 border border-transparent bg-[#5865F2] hover:bg-[#4752C4]"
                  onClick={confirmImportNavigation}
                >
                  Confirm
                </Button>
              </div>
            </Card>
          </div>
        )
        : null}
    </div>
  );
}

function ReplayCard({ replay, onDelete }: { replay: Replay; onDelete: (replayId: number) => void; }) {
  return (
    <Link to={`/replays/${replay.replay_id}`} className="block group">
      <Card className="bg-slate-800/50 border-slate-700 transition-all duration-200 group-hover:bg-slate-800 group-hover:border-slate-600 group-hover:shadow-lg border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Fetch Time</span>
            <span className="text-slate-200">
              {replay.fetch_time
                ? new Date(replay.fetch_time).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="z-10 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-blue-600/20 text-blue-300">
              <Play className="h-4 w-4" />
            </span>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600/20 text-red-300 hover:bg-red-600/30"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(replay.replay_id);
              }}
              aria-label={`Delete replay ${replay.replay_id}`}
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </Link>
  );
}
