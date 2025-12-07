import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ArrowLeft } from "lucide-react";

// Update Interface to match your Python SQL query exactly
interface ReplayDetailsType {
  replay_id: number;
  audio_id: number;      
  demo_fetch_time: string; // TODO
  demo_path: string; // TODO
  audio_path: string; 
  file_ext: string; // TODO
}

export function ReplayDetails() {
  const { id } = useParams();
  const [data, setData] = useState<ReplayDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      try {
        // Fetch from Node Gateway
        const res = await fetch(`http://localhost:5000/api/replays/${id}`, {
          credentials: 'include'
        });
        
        if (res.ok) {
          const json = await res.json();
          console.log("MATCH DATA RECEIVED:", json); // <--- Debug Log
          setData(json);
        } else {
          console.error("Failed to fetch match details");
        }
      } catch (e) {
        console.error("Error", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-white pt-8">
      <Link to="/replays">
        <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-slate-300">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Replays
        </Button>
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Match Details</h1>
        <p className="text-slate-400">Replay ID: <span className="text-white font-mono">{id}</span></p>
      </div>

      {isLoading ? (
        <div>Loading details...</div>
      ) : !data ? (
        <div>Replay not found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-8">
          
          {/* AUDIO PLAYER CARD */}
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl flex flex-col items-center justify-center gap-4">
            <h3 className="text-xl font-semibold text-slate-200">Match Audio</h3>
            
            {/* SAFETY CHECK: Only render if audio_id exists */}
            {data.audio_id ? (
              <>
                <audio 
                  controls 
                  className="w-full max-w-md"
                  // Use the ID from data, not the URL param
                  src={`http://localhost:5000/api/audio/stream/${data.audio_id}`} 
                />
                <p className="text-xs text-slate-500">
                  Linked Audio ID: {data.audio_id}
                </p>
              </>
            ) : (
              <div className="text-red-400">
                No audio file linked to this replay.
              </div>
            )}
          </div>

          {/* Placeholders */}
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl h-64 flex items-center justify-center">
            2D Viewer Placeholder
          </div>
        </div>
      )}
    </div>
  );
}