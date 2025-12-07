import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";


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
  "Whisper"
];

//Placeholder demo file handling
const DEMO_OPTIONS = [
  "demo1",
  "demo2"
];


const bigButton =
  "w-72 px-8 py-4 text-xl font-medium rounded-xl " +
  "bg-blue-600 hover:bg-blue-500 text-white shadow-lg " +
  "hover:[animation:spin_0.5s_ease-in-out]";

export default function ImportReplay() {
  const [audioOptions, setAudioRows] = useState<AudioRow[]>([]);
  //const[demoOptions, setDemoRows] = useState<DemoRow[]>([]);

  const [audioLoading, setAudioLoading] = useState(false);
  //const[demoLoading, setDemoLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selectedAudio, setSelectedAudio] = useState<AudioRow | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const canProceed = !!(selectedAudio && selectedModel && selectedDemo);

  const [activated, setActivated] = useState(false);

  const navigate = useNavigate(); // hook

  useEffect(() => {
    if (canProceed) {
      setActivated(true);
      const timer = setTimeout(() => setActivated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [canProceed]);

  async function fetchAudio() {

    if (audioLoading) {
      console.log("fetchAudio called while already loading, skipping");
      return;
    }

    console.log("fetchAudio: starting");
    setAudioLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:5000/api/audio", {
        credentials: "include",
      });

      console.log("fetchAudio: response status", res.status);

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status} ${res.statusText}`);
      }

      const data: AudioRow[] = await res.json();
      console.log("AudioRows:", data);

      setAudioRows(data);
    } catch (err: any) {
      console.error("fetchAudio: error", err);
      setError(err.message || "Unknown error");
    } finally {
      console.log("fetchAudio: finished, setting loading = false");
      setAudioLoading(false);
    }
  }

  /*
  async function fetchDemo(){
      try{
          setDemoLoading(true);
          setError(null);

          const res = await fetch("http://localhost:5000/api/demo", {
              credentials: "include",
          });
          if(!res.ok){
              throw new Error(`Request failed: ${res.status} ${res.statusText}`);
          }

          const data: DemoRow[] = await res.json();
          setDemoRows(data);
          console.log("DemoRows:", data);
      }catch (err:any) {
          setError(err.message || "Unknown error");
      }finally{
          setDemoLoading(false);
      }
  }
  */
  function handleAudioSelect(row: AudioRow) {
    console.log("Selected audio:", row);
    setSelectedAudio(row);
  }

  function handleModelSelect(model: string) {
    console.log("Selected model:", model);
    setSelectedModel(model);
  }

  function handleDemoSelect(demo: string) {
    console.log("Selected demo:", demo);
    setSelectedDemo(demo);
  }

  async function handleStart() {
    if (!canProceed) return;
    
    // 3. Send POST request
    try {
      const res = await fetch("http://localhost:5000/api/replays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_id: Number(selectedAudio?.audio_id), // Ensure Number type
          demo_name: selectedDemo,
          model: selectedModel
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail}`); // Show specific error from Python
        return;
      }

      console.log("Replay created successfully"); // direct to /replays after finishing
      setTimeout(() => {
        navigate("/replays");
      }, 1000);

    } catch (err) {
      console.error("Network error:", err);
      alert("Failed to connect to server.");
    }
  }

  function SparkleBurst() { // peak
    return (
      <div className="absolute inset-0 pointer-events-none animate-[sparkle-burst_0.8s_ease-out]">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-32 h-32 bg-teal-400/50 blur-xl rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col gap-4">

        {/* AUDIO */}
        <DropdownMenu
          onOpenChange={(open: boolean) => {
            console.log("Dropdown open:", open);
            if (open) fetchAudio();
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button className={bigButton}>
              {audioLoading ? "Loading Audio..."
                : selectedAudio
                  ? selectedAudio.audio_id
                  : "Select Audio"}
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
        {/* MODEL */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className={bigButton}>
              {selectedModel || "Select AI Model"}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72 bg-slate-800 text-white border-slate-700 rounded-xl">
            {MODEL_OPTIONS.map((model) => (
              <DropdownMenuItem
                key={model}
                className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                onClick={() => handleModelSelect(model)}
              >
                {model}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div>
        {/* DEMO */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className={bigButton}>
              {selectedDemo || "Select Demo File"}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72 bg-slate-800 text-white border-slate-700 rounded-xl">
            {DEMO_OPTIONS.map((demo) => (
              <DropdownMenuItem
                key={demo}
                className="px-4 py-2 hover:bg-slate-700 cursor-pointer"
                onClick={() => handleDemoSelect(demo)}
              >
                {demo}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative">
        {activated && <SparkleBurst />}
        <Button
          disabled={!canProceed}
          className={
            bigButton +
            " transition-all duration-500 " +
            (activated
              ? "animate-[button-activated_0/9s_ease-out] bg-green-500 shadow-2xl"
              : canProceed
                ? "bg-green-600 hover:bg-green-500"
                : "bg-gray-600 cursor-not-allowed opacity-50")
          }
          onClick={handleStart}
        >
          Process Replay
        </Button>
      </div>
    </div>
  );
}
