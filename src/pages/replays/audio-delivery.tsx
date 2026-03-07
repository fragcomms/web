// audio delivery test page, only accessible through [URL]/replays/audio-delivery
import {useRef} from "react";
import { Button } from "../../components/ui/button";

export default function AudioDelivery() {

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playAudio = () => {
        audioRef.current?.play().catch ((err) => {
            console.error("Error playing audio:", err);
        });
    };

    return (
        <div className = "min-h-screen text-white flex">
            <div style={{textAlign:"center", marginTop: "100px" }}>
                <Button onClick={playAudio}>
                    Play Audio
                </Button>

                <audio 
                    ref= {audioRef} 
                    src= "/combined_1765180639387_098f3f51.wav" 
                    preload = "auto" />
            </div>
        </div>
        
    );
}