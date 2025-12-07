import React from "react";
import {useState} from "react";
import {ClipboardIcon, CheckIcon} from "lucide-react";
import dotenv from "dotenv";

dotenv.config();
// change navbars
//change Router.tsx


export default function InviteBot() {

  const [copied, setCopied] = useState(false);
  const client_id = process.env.CLIENT_ID;

  const scopes = ["bot", "applications.commands"];
  const permissions = "8";
  const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client_id}&scope=${scopes.join(
    "%20"
  )}&permissions=${permissions}`;
  
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };
  
  return (
    <div className = "min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white px-4">
      <img 
        src="logo.png"
        alt="FragComms Bot"
        className="w-32 h-32 mb-6 rounded-full shadow-lg"
      />

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
            Link Copied!
          </>
        ) : (
          <>
            <ClipboardIcon className = "w-5 h-5" />
            Copy Invite Link
          </>
        )}
      </button> 
    </div>
    
  );
}