import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  

  const target = user ? "/replays" : "/login";
  const buttonText = user ? "Go to Replays" : "Log in with Discord";

  return (
    <>
      <h1 className="text-6xl font-bold mb-6 text-white text-center">FragComms</h1>
      <p className="text-xl text-gray-300 mb-8 text-center">Replays reimagined</p>
      
      <div className="flex gap-4 justify-center mb-16">
        
        <Link 
          to= {target}
          className="bg-blue-50 hover:bg-blue-700 text-white font-bold text-lg px-8 py-3 rounded-lg transition-colors duration-200"
        >
           {buttonText}
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {/* Your feature cards */}
      </div>
    </>
  )
}
