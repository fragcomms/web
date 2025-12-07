import { useState } from "react";
import { Button } from "../../components/ui/button";

//Audio database table
type AudioTable = {
  audio_id: string;
  file_ext: string;
  path: string;
  sampling_rate: number;
  creation_time: string;
};

const bigButton =
  "w-72 px-8 py-4 text-xl font-medium rounded-xl " +
  "bg-blue-600 hover:bg-blue-500 text-white shadow-lg " +
  "hover:[animation:spin_0.5s_ease-in-out]";

export default function ImportReplay(){
    const[audioRows, setAudioRows] = useState<AudioTable[]>([]);
    const[loading, setLoading] = useState(false);
    const[error, setError] = useState<string | null>(null);
    
    async function handleSelectAudio(){
        try{
            setLoading(true);
            setError(null);

            const res = await fetch("http://localhost:5000/api/audio");
            if(!res.ok){
                throw new Error('Request failed: ${res.status} ${res.statusText}');
            }

            const data: AudioTable[] = await res.json();
            setAudioRows(data);
            console.log("AudioRows:", data);
        }catch (err:any) {
            console.error("Error fetching audio:", err);
            setError(err.message || "Unknown error");
        }finally{
            setLoading(false);
        }
    }
    
    return(
        <div className = "min-h-screen bg-slate-900 flex items-center justify-center">
            <div className = "flex flex-col gap-4">
                <Button
                    className = {bigButton}
                    onClick = {handleSelectAudio}
                    disabled={loading}
                >
                    {loading ? "Loading Audio..." : "Select Audio"}
                </Button>

                <Button
                    className = {bigButton}
                    onClick = {() => console.log("Button 2 clicked")}
                    >
                    Select AI Model
                </Button>

                <Button
                    className = {bigButton}
                    onClick = {() => console.log("Button 3 clicked")}
                    >
                    Select Demo File
                </Button>
            </div>

            {/*Show Results */}
            {error && <p className="text-red-400 mb-4">Error: {error}</p>}

            {audioRows.length > 0 && (
                <div className="w-full max-w-xl bg-slate-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold mb-2">Audio rows</h2>
                    <ul className="space-y-1 text-sm text-slate-200">
                        {audioRows.map((row) => (
                            <li key={row.audio_id} className="border-b border-slate-700 pb-1 last:border-0">
                                <div>{row.path}</div>
                                <div className="text-slate-400">
                                    {row.file_ext} * {row.sampling_rate} Hz * {" "}
                                    {new Date(row.creation_time).toLocaleString()}                                  
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
