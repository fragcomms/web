import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

// match exactly with replay table
interface Replay {
  replay_id: number;
  map_name: string; // TODO
  match_date: string; // TODO
  winner: boolean; // TODO
  duration: string; // TODO
  platform: string; // TODO
}

export function ReplayLibrary() {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReplays() {
      try {
        const res = await fetch("http://localhost:5000/api/replays", {
          credentials: 'include'
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

      {replays.length === 0 ? (
        <div className="text-slate-400 text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <p className="mb-4">No replays found.</p>
          <Link to="/replays/import">
            <Button variant="outline" className="text-slate-300 border-slate-600 hover:text-white">
              Upload your first match
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {replays.map((replay) => (
            // 2. UPDATE KEY AND PROP: Use 'replay_id' here too
            <ReplayCard key={replay.replay_id} replay={replay} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplayCard({ replay }: { replay: Replay }) {
  const isWin = replay.winner === true; 
  const borderColor = isWin ? "border-l-green-500" : "border-l-red-500";
  const outcomeText = isWin ? "VICTORY" : "DEFEAT";
  const outcomeColor = isWin ? "text-green-400" : "text-red-400";

  return (
    // 3. UPDATE LINK: Use 'replay_id' to generate the correct URL
    <Link to={`/replays/${replay.replay_id}`} className="block group">
      
      <Card className={`bg-slate-800/50 border-slate-700 transition-all duration-200 
        group-hover:bg-slate-800 group-hover:border-slate-600 
        group-hover:shadow-lg border-l-4 ${borderColor}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 p-4">
          <div className="flex flex-col">
            <span className={`font-bold tracking-wider text-sm ${outcomeColor}`}>
              {outcomeText}
            </span>
            <span className="text-white text-lg font-semibold capitalize group-hover:text-blue-400 transition-colors">
              {replay.map_name || "Unknown Map"}
            </span>
          </div>

          <div className="flex flex-col md:items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Platform</span>
            <span className="text-slate-200">{replay.platform || "Competitive"}</span>
          </div>

          <div className="flex flex-col md:items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Length</span>
            <span className="text-slate-200">{replay.duration || "N/A"}</span>
          </div>

          <div className="flex flex-col md:items-end justify-center">
            <span className="text-xs text-slate-500 mb-2">
              {replay.match_date ? new Date(replay.match_date).toLocaleDateString() : "Recent"}
            </span>
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
        </div>
      </Card>
    </Link>
  );
}