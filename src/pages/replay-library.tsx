import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Play, Calendar, Clock, Filter } from "lucide-react";
import { Plus } from "lucide-react";

interface Replay {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  date: string;
  game: string;
  views: number;
}

const mockReplays: Replay[] = [
  {
    id: "1",
    title: "Team Liquid vs. FaZe Clan",
    thumbnail: "gaming competitive",
    duration: "15:32",
    date: "2025-11-18",
    game: "Valorant",
    views: 1234
  },
  {
    id: "2",
    title: "Cloud9 vs. G2 Esports",
    thumbnail: "esports action",
    duration: "8:45",
    date: "2025-11-17",
    game: "CS2",
    views: 856
  },
  {
    id: "3",
    title: "T1 vs. Gen.G",
    thumbnail: "gaming tournament",
    duration: "22:18",
    date: "2025-11-16",
    game: "League of Legends",
    views: 2341
  },
  {
    id: "4",
    title: "Sentinels vs. 100 Thieves",
    thumbnail: "gaming strategy",
    duration: "12:05",
    date: "2025-11-15",
    game: "Valorant",
    views: 1567
  },
  {
    id: "5",
    title: "Dallas Fuel vs. San Francisco Shock",
    thumbnail: "competitive gaming",
    duration: "18:22",
    date: "2025-11-14",
    game: "Overwatch",
    views: 945
  },
  {
    id: "6",
    title: "Natus Vincere vs. Vitality",
    thumbnail: "esports professional",
    duration: "25:47",
    date: "2025-11-13",
    game: "CS2",
    views: 3102
  }
];

export function ReplayLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<string>("All");

  const games = ["All", "Valorant", "CS2", "League of Legends", "Overwatch"];

  const filteredReplays = mockReplays.filter(replay => {
    const matchesSearch = replay.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGame = selectedGame === "All" || replay.game === selectedGame;
    return matchesSearch && matchesGame;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-white mb-2">Replay Library</h1>
            <p className="text-slate-400">Browse and watch your saved game replays</p>
          </div>
          <Button 
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
            onClick={() => console.log("Add new replay clicked")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Replay
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search replays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="flex gap-2 flex-wrap">
              {games.map((game) => (
                <Button
                  key={game}
                  variant={selectedGame === game ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedGame(game)}
                  className={
                    selectedGame === game
                      ? "bg-[#5865F2] hover:bg-[#4752C4] text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }
                >
                  {game}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Replay Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredReplays.map((replay) => (
            <ReplayCard key={replay.id} replay={replay} />
          ))}
        </div>

        {filteredReplays.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No replays found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReplayCard({ replay }: { replay: Replay }) {
  return (
    <Card className="bg-slate-800 border-slate-700 overflow-hidden hover:border-slate-600 transition-colors group cursor-pointer">
      <div className="flex">
        {/* Map Logo - Left Side */}
        <div className="relative w-48 h-32 bg-slate-900 flex-shrink-0">
          <ReplayThumbnail query={replay.thumbnail} />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-6 w-6 text-slate-900 ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
        
        {/* Replay Info - Right Side */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-white mb-2">{replay.title}</h3>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Badge variant="secondary" className="bg-slate-700 text-slate-300 hover:bg-slate-700">
                {replay.game}
              </Badge>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {replay.duration}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(replay.date).toLocaleDateString()}
              </div>
              <div>{replay.views.toLocaleString()} views</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReplayThumbnail({ query }: { query: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      {loading && (
        <div className="text-slate-600">
          <Play className="h-12 w-12" />
        </div>
      )}
      <img
        src={`https://source.unsplash.com/featured/800x450/?${encodeURIComponent(query)}`}
        alt="Replay thumbnail"
        className="w-full h-full object-cover"
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}