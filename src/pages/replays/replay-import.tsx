import { useState } from "react";
import { Button } from "../../components/ui/button";
import { 
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import connectPgSimple from "connect-pg-simple";


//Audio database table
type AudioRow = {
  audio_id: string;
  file_ext: string;
  path: string;
  sampling_rate: number;
  creation_time: string;
};

//Model ??
const MODEL_OPTIONS = [
    "Whisper",
    "ChatGPT",
    "A literal man transcribing it (please allow 14 business days for transcription",
    "Copilot",
    "Clippy"
];

//Replays database table
type ReplayTable = {
    replay_id: string;
    path: string;
    audio: string; 
    demo_fetch_time: string;
};


const bigButton =
  "w-72 px-8 py-4 text-xl font-medium rounded-xl " +
  "bg-blue-600 hover:bg-blue-500 text-white shadow-lg " +
  "hover:[animation:spin_0.5s_ease-in-out]";

export default function ImportReplay(){
    const[audioOptions, setAudioRows] = useState<AudioRow[]>([]);
    const[audioLoading, setAudioLoading] = useState(false);
    const[error, setError] = useState<string | null>(null);
    
    async function fetchAudio(){
        try{
            setAudioLoading(true);
            setError(null);

            const res = await fetch("http://localhost:5000/api/audio");
            if(!res.ok){
                throw new Error(`Request failed: ${res.status} ${res.statusText}`);
            }

            const data: AudioRow[] = await res.json();
            setAudioRows(data);
            console.log("AudioRows:", data);
        }catch (err:any) {
            setError(err.message || "Unknown error");
        }finally{
            setAudioLoading(false);
        }
    }

    function handleAudioSelect(row: AudioRow){
        console.log("Selected audio:", row);
    }
    
    return(
        <div className = "min-h-screen bg-slate-900 flex items-center justify-center">
            <div className = "flex flex-col gap-4">
                <DropdownMenu
                    onOpenChange={(open : boolean) => {
                        if (open) fetchAudio();
                    }}
                >
                    <DropdownMenuTrigger asChild>
                        <Button className={bigButton}>
                            {audioLoading ? "Loading Audio..." : "Select Audio"}
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-96 bg-slate-800 test-white border-slate-700 rounded-xl max-h-80 overflow-y-auto">

                        {audioLoading && (
                            <DropdownMenuItem disabled>Loading....</DropdownMenuItem>
                        )}

                        {!audioLoading && audioOptions.length === 0 && (
                            <DropdownMenuItem disabled>No audio files found</DropdownMenuItem>
                        )}

                        {audioOptions.map((row) => (
                            <DropdownMenuItem
                                key={row.audio_id}
                                className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleAudioSelect(row)}
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium truncate">{row.path}</span>
                                    <span className="text-xs text-slate-300">
                                        {row.file_ext} * {row.sampling_rate} Hz * {" "}
                                        {new Date(row.creation_time).toLocaleString()}
                                    </span>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className={bigButton}>
                            Select AI Model
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-72 bg-slate-800 text-white border-slate-700 rounded-xl">
                        {MODEL_OPTIONS.map((model) => (
                            <DropdownMenuItem
                                key={model}
                                className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                                onClick={() => console.log("Selected model:",model)}
                            >
                                {model}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

                <Button
                    className = {bigButton}
                    onClick = {() => console.log("Button 3 clicked")}
                    >
                    Select Demo File
                </Button>
            </div>
    );
}
