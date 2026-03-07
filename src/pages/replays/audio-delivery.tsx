import { useEffect, useState } from "react";

export default function AudioDelivery() {
  const [tracks, setTracks] = useState<number[]>([]);
  const audioId = 1; // change to real audio id

  useEffect(() => {
    async function fetchTracks() {
      const res = await fetch(`/api/audio/${audioId}/tracks`);
      const data = await res.json();
      setTracks(data.map((t: any) => t.index));
    }

    fetchTracks();
  }, []);

  return (
    <div>
      <h1>Audio Tracks</h1>

      {tracks.map((track) => (
        <div key={track}>
          <p>Track {track}</p>

          <audio controls>
            <source
              src={`/api/audio/${audioId}/stream/${track}`}
              type="audio/wav"
            />
          </audio>
        </div>
      ))}
    </div>
  );
}