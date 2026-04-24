import { Link } from "react-router-dom";
import { useAuth } from "../utils/context/context";

export default function Home() {
  const { user } = useAuth();

  const target = user ? "/replays" : "/login";
  const buttonText = user ? "Go to Replays" : "Log in with Discord";
  const featuredVideoUrl = "https://www.youtube.com/embed/wZzV8NQk8VY";

  return (
    <div className="w-full">
      <section className="min-h-[calc(100vh-9rem)] w-full flex flex-col items-center justify-center">
        <h1
          className="text-6xl mb-6 text-slate-900 dark:text-white text-center"
          style={{
            fontFamily: "Impact, Haettenschweiler, \"Arial Narrow Bold\", sans-serif",
          }}
        >
          FragComms
        </h1>
        <p className="text-xl text-slate-600 dark:text-gray-300 mb-8 text-center">Replays reimagined to the fullest.</p>

        <div className="flex gap-4 justify-center">
          <Link
            to={target}
            className="bg-slate-800 dark:bg-gray-700 hover:bg-slate-700 dark:hover:bg-gray-600 text-white font-bold text-lg px-8 py-3 rounded-lg transition-colors duration-200"
          >
            {buttonText}
          </Link>
        </div>
      </section>

      <div className="h-[clamp(2rem,10vh,8rem)]" aria-hidden="true" />

      <section className="w-full max-w-4xl mx-auto mb-16 pt-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white text-center mb-4">Intro to FragComms</h2>
        <div className="relative w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 shadow-lg">
          <div className="pt-[56.25%]" />
          <iframe
            className="absolute inset-0 h-full w-full"
            src={featuredVideoUrl}
            title="FragComms overview video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mx-auto">
        {/* Your feature cards */}
      </div>
    </div>
  );
}
