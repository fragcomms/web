import { Link } from "react-router-dom";
import { useAuth } from "../utils/context/context";

export default function Home() {
  const { user } = useAuth();

  const target = user ? "/replays" : "/login";
  const buttonText = user ? "Go to Replays" : "Log in with Discord";

  return (
    <>
      <h1
        className="text-6xl mb-6 text-slate-900 dark:text-white text-center"
        style={{
          fontFamily: "Impact, Haettenschweiler, \"Arial Narrow Bold\", sans-serif",
        }}
      >
        FragComms
      </h1>
      <p className="text-xl text-slate-600 dark:text-gray-300 mb-8 text-center">Replays reimagined</p>

      <div className="flex gap-4 justify-center mb-16">
        <Link
          to={target}
          className="bg-slate-800 dark:bg-gray-700 hover:bg-slate-700 dark:hover:bg-gray-600 text-white font-bold text-lg px-8 py-3 rounded-lg transition-colors duration-200"
        >
          {buttonText}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {/* Your feature cards */}
      </div>
    </>
  );
}
