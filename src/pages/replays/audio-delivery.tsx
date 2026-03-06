import {useRef} from "react";

export default function AudioDelivery() {

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playAudio = () => {
        audioRef.current?.play().catch ((err) => {
            console.error("Error playing audio:", err);
        });
    };

    return (
        <div style={{textAlign:"center", marginTop: "100px" }}>
            <button onClick={playAudio}>
                Play Audio
            </button>

            <audio 
                ref= {audioRef} 
                src= "/combined_1765180639387_098f3f51.wav" 
                preload = "auto" />
        </div>
    );
}