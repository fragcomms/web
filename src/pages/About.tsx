import { User } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      
      {/* Hero Section */}
      <section id="home" className="relative pt-40 pb-24 px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e40af]/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-block mb-6 px-3 py-1 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/50">
            <span className="text-[#60a5fa] text-sm font-medium">UNR Computer Science</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-[#e0e7ff] to-[#60a5fa] bg-clip-text text-transparent">
            FragComms
          </h1>

          {/* Subtitle */}
          <h2 className="text-lg md:text-xl text-[#cbd5e1] mb-8 font-light">
            CS 426 Senior Project in Computer Science, Spring 2025, at UNR, CSE Department
          </h2>

          {/* Description */}
          <p className="text-[#b0b9c6] text-base leading-relaxed mb-8 max-w-3xl mx-auto">
            This project focuses on the reliable synchronization of in-game communications from Counter-Strike 2 matches to a website after the game concludes. The intended user group for this project will be professionals, analysts, coaches, and many others who play CS2. The reason being that the current market is very bare in terms of analytical tools. Many services offer the same old service, which is map replay. 
	However, we are adding a different dimension to our service where there will be audio automatically uploaded and synced to the replay if they are using our Discord bot. We are giving the user group a map replay with audio synced to the events that happen in-game and analyzing whether the communications were “good” or “bad”. To do so, we will utilize Discord, WhisperX, LaihoE/demoparser, and many others. The listed names here are crucial to our project, and we cannot do without.
	We are developing the tool for universal use by any player, so anyone who is not a professional, analyst, coach, etc., can still utilize it. The project aims to improve the player’s chemistry with their teams and/or specific players. Furthermore, the project can be 
	Since people play CS2 globally, we should expect our product to remain reliable every day. Without reliability, most of the player base, which is not located in the Americas, wouldn’t use our product as much. We will accomplish 24/7 availability by hosting the website on a VPS with caching abilities so that if the database goes down, the user can access their previously accessed replay.
	Security is a top priority for this project, as if there is any unauthorized access to communications, it will ruin a team’s playbook. Only authorized users will be allowed to listen and read the transcriptions. In terms of safety, we will attempt to omit identifying information from the transcriptions/audio. However, it is a tall task, and so we will do the most with securing the replays to the accounts as much as possible so that no unauthorized person can freely access the data. To do so, we will tailor the SQL queries to guarantee user access. We will also block any user’s IP address for a week if they try to do injections on the website.
          </p>
        </div>
      </section>

      {/* Team Section */}
      <section id="about" className="py-20 px-6 bg-[#1e293b]/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-white mb-4 text-center">Meet Our Team</h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-2xl mx-auto">
            A diverse group of experts united by our passion for innovation and excellence.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-[#475569]" />
              </div>
              <h4 className="text-white mb-1">Team Member 1</h4>
              <p className="text-[#60a5fa] mb-2">CEO & Founder</p>
              <p className="text-[#94a3b8]">Visionary leader with expertise in tech</p>
            </div>
            
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-[#475569]" />
              </div>
              <h4 className="text-white mb-1">Team Member 2</h4>
              <p className="text-[#60a5fa] mb-2">CTO</p>
              <p className="text-[#94a3b8]">Technical architect and innovation driver</p>
            </div>
            
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-[#475569]" />
              </div>
              <h4 className="text-white mb-1">Team Member 3</h4>
              <p className="text-[#60a5fa] mb-2">Head of Design</p>
              <p className="text-[#94a3b8]">Creating beautiful user experiences</p>
            </div>

            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-[#475569]" />
              </div>
              <h4 className="text-white mb-1">Team Member 4</h4>
              <p className="text-[#60a5fa] mb-2">Lead Developer</p>
              <p className="text-[#94a3b8]">Building scalable solutions</p>
            </div>
            
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-[#475569]" />
              </div>
              <h4 className="text-white mb-1">Team Member 5</h4>
              <p className="text-[#60a5fa] mb-2">Marketing Director</p>
              <p className="text-[#94a3b8]">Growing our community and reach</p>
            </div>
            
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 flex items-center justify-center">
                <User className="w-12 h-12 text-[#475569]" />
              </div>
              <h4 className="text-white mb-1">Team Member 6</h4>
              <p className="text-[#60a5fa] mb-2">Product Manager</p>
              <p className="text-[#94a3b8]">Driving product vision and strategy</p>
            </div>
          </div>
        </div>
      </section>
    
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#334155]">
        <div className="max-w-5xl mx-auto text-center text-[#64748b]">
          <p>© 2025 FragComms. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}