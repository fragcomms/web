import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Import Link for navigation
import { Plus } from "lucide-react"; // Import Plus icon
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button"; // Import Button component

// 1. Define the shape of a Replay object
interface Replay {
  id: number;
  map_name: string;
  match_date: string;
  winner: boolean;
  duration: string;
  platform: string;
}

export function ReplayLibrary() {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Fetch Data on Mount
  useEffect(() => {
    async function fetchReplays() {
      try {
        const res = await fetch("http://localhost:5000/api/replays", {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
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
    <div className="w-full max-w-5xl mx-auto space-y-6"> {/* Increased spacing */}
      
      {/* --- HEADER SECTION START --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Match History</h1>
          <p className="text-slate-400 text-sm">Browse and manage your saved matches</p>
        </div>
        
        {/* The Add Button */}
        <Link to="/replays/import">
          <Button 
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Replay
          </Button>
        </Link>
      </div>
      {/* --- HEADER SECTION END --- */}

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
        // 3. Render the List
        <div className="flex flex-col gap-3">
          {replays.map((replay) => (
            <ReplayCard key={replay.id} replay={replay} />
          ))}
        </div>
      )}
    </div>
  );
}

// 4. The "Long Rectangle" Card Component
function ReplayCard({ replay }: { replay: Replay }) {
  const isWin = replay.winner === true; 
  const borderColor = isWin ? "border-l-green-500" : "border-l-red-500";
  const outcomeText = isWin ? "VICTORY" : "DEFEAT";
  const outcomeColor = isWin ? "text-green-400" : "text-red-400";

  return (
    // 1. WRAPPER LINK: Makes the whole area clickable
    // We use 'block' so it behaves like a div, and 'group' to handle hover styles inside
    <Link to={`/replays/${replay.id}`} className="block group">
      
      <Card className={`bg-slate-800/50 border-slate-700 transition-all duration-200 
        group-hover:bg-slate-800 group-hover:border-slate-600 
        group-hover:shadow-lg border-l-4 ${borderColor}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 p-4">
          
          {/* Column 1: Outcome & Map */}
          <div className="flex flex-col">
            <span className={`font-bold tracking-wider text-sm ${outcomeColor}`}>
              {outcomeText}
            </span>
            <span className="text-white text-lg font-semibold capitalize group-hover:text-blue-400 transition-colors">
              {replay.map_name}
            </span>
          </div>

          {/* Column 2: Platform */}
          <div className="flex flex-col md:items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Platform</span>
            <span className="text-slate-200">{replay.platform || "Competitive"}</span>
          </div>

          {/* Column 3: Duration */}
          <div className="flex flex-col md:items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Length</span>
            <span className="text-slate-200">{replay.duration || "N/A"}</span>
          </div>

          {/* Column 4: Date & Action */}
          <div className="flex flex-col md:items-end justify-center">
            <span className="text-xs text-slate-500 mb-2">
              {new Date(replay.match_date).toLocaleDateString()}
            </span>
            
            {/* 2. BUTTON HANDLING: Stop the Link from activating */}
            <button 
              className="z-10 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors"
              onClick={(e) => {
                e.preventDefault(); // <--- This prevents the Link from navigating
                console.log("Downloading replay...", replay.id);
                // Add your download logic here
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