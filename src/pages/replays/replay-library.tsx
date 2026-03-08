import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  if (isLoading) {
    return <div className="text-white text-center mt-10">Loading replays...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Match History</h1>
          <p className="text-slate-400 text-sm">Browse and manage your saved matches</p>
        </div>
        <Link to="/replays/import">
          <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            Add New Replay
          </Button>
        </Link>
      </div>

      {replays.length === 0
        ? (
          <div className="text-slate-400 text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <p className="mb-4">No replays found.</p>
            <Link to="/replays/import">
              <Button variant="outline" className="text-slate-300 border-slate-600 hover:text-white">
                Upload your first match!
              </Button>
            </Link>
          </div>
        )
        : (
          <div className="flex flex-col gap-3">
            {replays.map((replay) => <ReplayCard key={replay.replay_id} replay={replay} />)}
          </div>
        )}
    </div>
  );
}

function ReplayCard({ replay }: { replay: Replay; }) {
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

          <button
            className="z-10 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors"
            onClick={(e) => {
              e.preventDefault();
              console.log("Downloading replay...", replay.replay_id);
            }}
          >
            Download .dem
          </button>
        </div>
      </Card>
    </Link>
  );
}
