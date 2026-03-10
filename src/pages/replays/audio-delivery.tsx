import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";





export default function AudioDelivery() {
  const {id} = useParams();
  const [tracks, setTracks] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  // const audioId = 1; // change to real audio id

  useEffect(() => {

    if(!id) {
      console.error("No audio ID in URL.");
      return;
    }
    // fetch tracks
    async function fetchTracks() {
      const res = await fetch(`http://localhost:5000/api/audio/${id}/tracks`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      setTracks(data.tracks);
    }

    fetchTracks();
  }, [id]);

  const playAll = () => {
    const audios = document.querySelectorAll<HTMLAudioElement>(".track-audio");
    audios.forEach((audio) => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });
    setPlaying(true);

  };

  const pauseAll = () => {
    const audios = document.querySelectorAll<HTMLAudioElement>(".track-audio");
    audios.forEach((audio) => {
      audio.pause();
    });
    setPlaying(false);
  };

  return (
    <div>
      <h1>Recording</h1>
      <Button onClick= {playing ? pauseAll : playAll}>
        {playing ? "Pause All" : "Play All"}
      </Button>

      {tracks.map((track) => (
        <div key={track}>
          <p>Track {track}</p>
          <audio className = 
          "track-audio" 
          //controls
          crossOrigin="use-credentials" 
          preload="auto"
          >
            <source
              src={`http://localhost:5000/api/audio/${id}/stream/${track}`}
              type="audio/wav"
            />
          </audio>
        </div>
      ))}
    </div>
  );
}