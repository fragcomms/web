// @ts-expect-error user not req right now
import { Github, User } from "lucide-react";

export default function About() {
  return (
    <div>
      
      {/* ============ HERO SECTION ============ */}
      <section id="home" className="relative pt-20 md:pt-15 pb-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Title */}
          <h1 className="text-white md:text-6xl font-bold mb-4">
            About FragComms
          </h1>

          {/* Subtitle */}
          <h2 className="text-lg md:text-xl text-[#cbd5e1] mt-6 mb-8 font-light">
            CS 426 Senior Project in Computer Science, Spring 2025, at UNR, CSE Department
          </h2>

          {/* Description Content */}
          <div className="space-y-6 text-center max-w-3xl mx-auto">
            <p className="text-[#cbd5e1] leading-relaxed">
              This project focuses on the reliable synchronization of in-game communications from Counter-Strike 2 matches to a website after the game concludes. The intended user group for this project will be professionals, analysts, coaches, and many others who play CS2. The reason being that the current market is very bare in terms of analytical tools. Many services offer the same old service, which is map replay.
            </p>

            <p className="text-[#cbd5e1] leading-relaxed">
              However, we are adding a different dimension to our service where there will be audio automatically uploaded and synced to the replay if they are using our Discord bot. We are giving the user group a map replay with audio synced to the events that happen in-game and analyzing whether the communications were "good" or "bad". To do so, we will utilize Discord, WhisperX, LaihoE/demoparser, and many others. The listed names here are crucial to our project, and we cannot do without.
            </p>

            <p className="text-[#cbd5e1] leading-relaxed">
              We are developing the tool for universal use by any player, so anyone who is not a professional, analyst, coach, etc., can still utilize it. The project aims to improve the player's chemistry with their teams and/or specific players.
            </p>

            <p className="text-[#cbd5e1] leading-relaxed">
              Since people play CS2 globally, we should expect our product to remain reliable every day. Without reliability, most of the player base, which is not located in the Americas, wouldn't use our product as much. We will accomplish 24/7 availability by hosting the website on a VPS with caching abilities so that if the database goes down, the user can access their previously accessed replay.
            </p>

            <p className="text-[#cbd5e1] leading-relaxed">
              Security is a top priority for this project, as if there is any unauthorized access to communications, it will ruin a team's playbook. Only authorized users will be allowed to listen and read the transcriptions. In terms of safety, we will attempt to omit identifying information from the transcriptions/audio. However, it is a tall task, and so we will do the most with securing the replays to the accounts as much as possible so that no unauthorized person can freely access the data. To do so, we will tailor the SQL queries to guarantee user access. We will also block any user's IP address for a week if they try to do injections on the website.
            </p>
          </div>
        </div>
      </section>

      {/* ============ TEAM SECTION ============ */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Section Header */}
          <h2 className="text-white mb-4 text-center">Meet Our Team</h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-2xl mx-auto">
            A diverse group of experts united by our passion for innovation and excellence.
          </p>
          
          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Team Member Card 1 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img 
                  src="ayayrom.png" 
                  alt="Aaron"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-white mb-1">ayayrom</h4>
              <p className="text-[#60a5fa] mb-2">Team Leader</p>
              <p className="text-[#94a3b8]">Sleep-deprived leader and CS player</p>
              <a
                href="https://github.com/ayayrom"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#334155] text-[#94a3b8] hover:text-white hover:border-white transition"
                aria-label="GitHub Profile"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
            
            {/* Team Member Card 2 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img 
                  src="vite.svg" 
                  alt="Marcille Mewing"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-white mb-1">Complicated128</h4>
              <p className="text-[#60a5fa] mb-2">Glutton</p>
              <p className="text-[#94a3b8]">Balancing too many things at once</p>
              <a
                href="https://github.com/Complicated128"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#334155] text-[#94a3b8] hover:text-white hover:border-white transition"
                aria-label="GitHub Profile"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
            
            {/* Team Member Card 3 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img 
                  src="atom-nash-775.png" 
                  alt="Shannon"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-white mb-1">atom-nash-775</h4>
              <p className="text-[#60a5fa] mb-2">Bot Dev</p>
              <p className="text-[#94a3b8]">Where did he go?</p>
              <a
                href="https://github.com/atom-nash-775"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#334155] text-[#94a3b8] hover:text-white hover:border-white transition"
                aria-label="GitHub Profile"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>

            {/* Team Member Card 4 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img 
                  src="jdarbyUNR.png" 
                  alt="Jacob Darby"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-white mb-1">jdarbyUNR</h4>
              <p className="text-[#60a5fa] mb-2">Rockstar Coder</p>
              <p className="text-[#94a3b8]">Part-time coder and singer of the band Etiquette</p>
              <a
                href="https://github.com/jdarbyUNR"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#334155] text-[#94a3b8] hover:text-white hover:border-white transition"
                aria-label="GitHub Profile"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ADVISORS ============ */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Section Header */}
          <h2 className="text-white mb-4 text-center">Meet Our Advsiors/Instructors</h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-2xl mx-auto">
            This project was developed under the guidance of the following people.
          </p>
          
          {/* Advisor Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Advisor Card 1 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img 
                  src="marcille-mewing-v0-6hfox7so5cxc1.webp" 
                  alt="Marcille Mewing"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-white mb-1">Wilmer (Justqwerty)</h4>
              <p className="text-[#60a5fa] mb-2">External Advisor</p>
              <p className="text-[#94a3b8]">Product Designer for SCL.gg</p>
            </div>
            
            {/* Advisor Card 2 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img 
                  src="David_Feil-Seifer.png" 
                  alt="Davud Feil-Seifer"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-white mb-1">Dr. Dave Feil-Seifer</h4>
              <p className="text-[#60a5fa] mb-2">Instructor</p>
              <p className="text-[#94a3b8]">Professor of Computer Science & Engineering at University of Nevada, Reno</p>
            </div>
            
            {/* Advisor Card 3 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] text-center">
              <div className="w-24 h-24 rounded-full bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img 
                  src="Vinh_Le.png" 
                  alt="Vinh Le"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-white mb-1">Dr. Vinh Le</h4>
              <p className="text-[#60a5fa] mb-2">Instructor</p>
              <p className="text-[#94a3b8]">OIT Administrator/Instructor at University of Nevada, Reno</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ REFRENCES ============ */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Section Header */}
          <h2 className= "text-white mb-4 text-center">Project Related Resources</h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-2xl mx-auto">
            The following are links to resources we utilized to build our project.
          </p>
          {/* Resources List */}
          <div className="space-y-4 max-w-3xl mx-auto">
            
            {/* Resource Item 1 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] hover:border-[#60a5fa] transition">
              <a 
                href="https://github.com/LaihoE/demoparser" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#60a5fa] hover:text-white font-semibold text-lg mb-2 block"
              >
                LaihoE/demoparser
              </a>
              <p className="text-[#94a3b8]">
                Python library for parsing Counter-Strike 2 demo files and extracting game data.
              </p>
            </div>

            {/* Resource Item 2 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] hover:border-[#60a5fa] transition">
              <a 
                href="https://github.com/openai/whisper" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#60a5fa] hover:text-white font-semibold text-lg mb-2 block"
              >
                WhisperX
              </a>
              <p className="text-[#94a3b8]">
                Advanced speech recognition model for accurate audio transcription and voice analysis.
              </p>
            </div>

            {/* Resource Item 3 */}
            <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155] hover:border-[#60a5fa] transition">
              <a 
                href="https://discord.com/developers/docs/intro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#60a5fa] hover:text-white font-semibold text-lg mb-2 block"
              >
                Discord API
              </a>
              <p className="text-[#94a3b8]">
                Platform for building bots and integrations to sync voice communications.
              </p>
            </div>

            {/* Add more resources as needed */}
          </div>


        </div>
      </section>
    
      {/* ============ FOOTER ============ */}
      <footer className="py-8 px-6 border-t border-[#334155]">
        <div className="max-w-5xl mx-auto text-center text-[#64748b]">
          <p>All rights reserved to 67.</p>
        </div>
      </footer>
    </div>
  );
}