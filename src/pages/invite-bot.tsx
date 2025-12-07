import React, { useState, useEffect } from "react";
import { ClipboardIcon, CheckIcon } from "lucide-react";

export default function InviteBot() {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch the bot invite link from backend
  useEffect(() => {
    const fetchInviteLink = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/getBotInviteLink");
        if (!res.ok) throw new Error("Failed to fetch invite link");

        const data = await res.json(); // { url: "..." }
        if (!data.url) throw new Error("Invite link missing in response");

        setInviteLink(data.url);
      } catch (err: any) {
        console.error("Error fetching invite link:", err);
        setError("Unable to load invite link");
      } finally {
        setLoading(false);
      }
    };

    fetchInviteLink();
  }, []);

  // Copy link to clipboard
  const copyInvite = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
<<<<<<< HEAD
      console.error("Failed to copy: ", err);
    }
  };
  
  return (
    <div className = "min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white px-4">
      <img 
        src="logo.png"
=======
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4">
      <img
        src="src/assets/logo.png"
>>>>>>> 9ef93dd7ca31838dc14a6a0b33303f2ed987a670
        alt="FragComms Bot"
        className="w-32 h-32 mb-6 rounded-full shadow-lg"
      />

<<<<<<< HEAD
      <h1 className = "text-4x1 font-bold mb-4 text-center">Invite Bot to Server</h1>
      <p className = "text-lg mb-8 text-center max-w-md">
        Add the FragComms Audio Recording Bot to your Discord server.
      </p>

      {/* Invite link button */}
      <a 
        href = {inviteLink}
        target = "_blank"
        rel = "noopener noreferrer"
        className = "bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg mb-4 transition-colors duration-200"
      >
        Invite Bot
      </a>

      {/* Copy to clipboard burron*/}
      <button
        onClick={copyInvite}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
      >
        {copied ? (
          <>
            <CheckIcon className = "w-5 h-5 text-green-400" />
=======
      <h1 className="text-4xl font-bold mb-4 text-center">Invite Bot to Server</h1>
      <p className="text-lg mb-8 text-center max-w-md">
        Add the FragComms Audio Recording Bot to your Discord server.
      </p>

      {/* Error */}
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Invite link button */}
      <a
        href={inviteLink || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={`${
          inviteLink
            ? "bg-blue-50 hover:bg-blue-700"
            : "bg-gray-600 cursor-not-allowed"
        } text-white font-bold px-6 py-3 rounded-lg mb-4 transition-colors duration-200`}
      >
        {loading ? "Loading..." : "Invite Bot"}
      </a>

      {/* Copy to clipboard button */}
      <button
        onClick={copyInvite}
        disabled={!inviteLink}
        className={`flex items-center gap-2 ${
          inviteLink
            ? "bg-gray-800 hover:bg-gray-700"
            : "bg-gray-600 cursor-not-allowed"
        } text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200`}
      >
        {copied ? (
          <>
            <CheckIcon className="w-5 h-5 text-green-400" />
>>>>>>> 9ef93dd7ca31838dc14a6a0b33303f2ed987a670
            Link Copied!
          </>
        ) : (
          <>
<<<<<<< HEAD
            <ClipboardIcon className = "w-5 h-5" />
            Copy Invite Link
          </>
        )}
      </button> 
    </div>
    
  );
}
=======
            <ClipboardIcon className="w-5 h-5" />
            Copy Invite Link
          </>
        )}
      </button>
    </div>
  );
}
>>>>>>> 9ef93dd7ca31838dc14a6a0b33303f2ed987a670
