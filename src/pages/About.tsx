import { Github } from "lucide-react";

export default function About() {
  return (
    <div className="bg-slate-50 text-slate-900 dark:bg-transparent dark:text-inherit">
      {/* ============ HERO SECTION ============ */}
      <section id="hero" className="relative pt-8 md:pt-16 pb-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Title */}
          <div className="mb-4">
            <h1 className="text-4xl md:text-6xl font-bold bg-linear-to-r from-slate-900 via-[#1e293b] to-[#2563eb] dark:from-white dark:via-[#e0e7ff] dark:to-[#60a5fa] bg-clip-text text-transparent pb-4">
              About FragComms
            </h1>
            <div className="w-64 h-0.5 bg-linear-to-r from-slate-900 via-[#1e293b] to-[#2563eb] dark:from-white dark:via-[#e0e7ff] dark:to-[#60a5fa] mx-auto mt-4"></div>
          </div>

          {/* Subtitle */}
          <h2 className="text-lg md:text-xl text-slate-600 dark:text-[#cbd5e1] mt-6 mb-8 font-light">
            CS 426 Senior Project in Computer Science, Spring 2025, at UNR, CSE Department
          </h2>

          {/* Description Content */}
          <div className="space-y-6 text-center max-w-3xl mx-auto">
            <p className="text-slate-700 dark:text-[#cbd5e1] leading-relaxed">
              This project focuses on the reliable synchronization of in-game communications from Counter-Strike 2
              matches to a website after the game concludes. The intended user group for this project will be
              professionals, analysts, coaches, and many others who play CS2. The reason being that the current market
              is very bare in terms of analytical tools. Many services offer the same old service, which is map replay.
            </p>

            <p className="text-slate-700 dark:text-[#cbd5e1] leading-relaxed">
              However, we are adding a different dimension to our service where there will be audio automatically
              uploaded and synced to the replay if they are using our Discord bot. We are giving the user group a map
              replay with audio synced to the events that happen in-game and analyzing whether the communications were
              "good" or "bad". To do so, we will utilize Discord, WhisperX, LaihoE/demoparser, and many others. The
              listed names here are crucial to our project, and we cannot do without.
            </p>

            <p className="text-slate-700 dark:text-[#cbd5e1] leading-relaxed">
              We are developing the tool for universal use by any player, so anyone who is not a professional, analyst,
              coach, etc., can still utilize it. The project aims to improve the player's chemistry with their teams
              and/or specific players.
            </p>

            <p className="text-slate-700 dark:text-[#cbd5e1] leading-relaxed">
              Since people play CS2 globally, we should expect our product to remain reliable every day. Without
              reliability, most of the player base, which is not located in the Americas, wouldn't use our product as
              much. We will accomplish 24/7 availability by hosting the website on a VPS with caching abilities so that
              if the database goes down, the user can access their previously accessed replay.
            </p>

            <p className="text-slate-700 dark:text-[#cbd5e1] leading-relaxed">
              Security is a top priority for this project, as if there is any unauthorized access to communications, it
              will ruin a team's playbook. Only authorized users will be allowed to listen and read the transcriptions.
              In terms of safety, we will attempt to omit identifying information from the transcriptions/audio.
              However, it is a tall task, and so we will do the most with securing the replays to the accounts as much
              as possible so that no unauthorized person can freely access the data. To do so, we will tailor the SQL
              queries to guarantee user access. We will also block any user's IP address for a week if they try to do
              injections on the website.
            </p>
          </div>
        </div>
      </section>

      {/* ============ TEAM SECTION ============ */}
      <section id="team" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 text-center">Meet Our Team</h2>
          <p className="text-slate-600 dark:text-[#cbd5e1] text-center mb-12 max-w-2xl mx-auto">
            A diverse group of experts united by our passion for innovation and excellence.
          </p>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Team Member Card 1 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] text-center shadow-sm dark:shadow-none">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img
                  src="https://avatars.githubusercontent.com/ayayrom"
                  alt="ayayrom, Team Leader - Sleep-deprived leader and CS player"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1 font-semibold">ayayrom</h3>
              <p className="text-blue-600 dark:text-[#60a5fa] mb-2 font-medium">Team Leader</p>
              <p className="text-slate-600 dark:text-[#cbd5e1] mb-4">Sleep-deprived leader and CS player</p>
              <a
                href="https://github.com/ayayrom"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-300 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:text-slate-900 dark:hover:text-white hover:border-slate-500 dark:hover:border-white transition focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b]"
                aria-label="ayayrom GitHub Profile (opens in new window)"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>

            {/* Team Member Card 2 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] text-center shadow-sm dark:shadow-none">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img
                  src="https://avatars.githubusercontent.com/Complicated128"
                  alt="Complicated128, Glutton - Balancing too many things at once"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1 font-semibold">Complicated128</h3>
              <p className="text-blue-600 dark:text-[#60a5fa] mb-2 font-medium">Glutton</p>
              <p className="text-slate-600 dark:text-[#cbd5e1] mb-4">Balancing too many things at once</p>
              <a
                href="https://github.com/Complicated128"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-300 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:text-slate-900 dark:hover:text-white hover:border-slate-500 dark:hover:border-white transition focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b]"
                aria-label="Complicated128 GitHub Profile (opens in new window)"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>

            {/* Team Member Card 3 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] text-center shadow-sm dark:shadow-none">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img
                  src="https://avatars.githubusercontent.com/atom-nash-775"
                  alt="atom-nash-775, Bot Developer - Where did he go?"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1 font-semibold">atom-nash-775</h3>
              <p className="text-blue-600 dark:text-[#60a5fa] mb-2 font-medium">Bot Developer</p>
              <p className="text-slate-600 dark:text-[#cbd5e1] mb-4">Where did he go?</p>
              <a
                href="https://github.com/atom-nash-775"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-300 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:text-slate-900 dark:hover:text-white hover:border-slate-500 dark:hover:border-white transition focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b]"
                aria-label="atom-nash-775 GitHub Profile (opens in new window)"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>

            {/* Team Member Card 4 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] text-center shadow-sm dark:shadow-none">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img
                  src="https://avatars.githubusercontent.com/jdarbyUNR"
                  alt="jdarbyUNR, Rockstar Coder - Part-time coder and singer of the band Etiquette"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1 font-semibold">jdarbyUNR</h3>
              <p className="text-blue-600 dark:text-[#60a5fa] mb-2 font-medium">Rockstar Coder</p>
              <p className="text-slate-600 dark:text-[#cbd5e1] mb-4">Part-time coder and singer of the band Etiquette</p>
              <a
                href="https://github.com/jdarbyUNR"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-300 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:text-slate-900 dark:hover:text-white hover:border-slate-500 dark:hover:border-white transition focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b]"
                aria-label="jdarbyUNR GitHub Profile (opens in new window)"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ADVISORS ============ */}
      <section id="advisors" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 text-center">
            Meet Our Advisors & Instructors
          </h2>
          <p className="text-slate-600 dark:text-[#cbd5e1] text-center mb-12 max-w-2xl mx-auto">
            This project was developed under the guidance of the following people.
          </p>

          {/* Advisor Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Advisor Card 1 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] text-center shadow-sm dark:shadow-none">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img
                  src="marcille-mewing-v0-6hfox7so5cxc1.webp"
                  alt="Wilmer (Justqwerty), External Advisor - Product Designer for SCL.gg"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1 font-semibold">Wilmer (Justqwerty)</h3>
              <p className="text-blue-600 dark:text-[#60a5fa] mb-2 font-medium">External Advisor</p>
              <p className="text-slate-600 dark:text-[#cbd5e1]">Product Designer for SCL.gg</p>
            </div>

            {/* Advisor Card 2 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] text-center shadow-sm dark:shadow-none">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img
                  src="David_Feil-Seifer.svg"
                  alt="Dr. Dave Feil-Seifer, Instructor - Professor of Computer Science & Engineering at University of Nevada, Reno"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1 font-semibold">Dr. Dave Feil-Seifer</h3>
              <p className="text-blue-600 dark:text-[#60a5fa] mb-2 font-medium">Instructor</p>
              <p className="text-slate-600 dark:text-[#cbd5e1]">
                Professor of Computer Science & Engineering at University of Nevada, Reno
              </p>
            </div>

            {/* Advisor Card 3 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] text-center shadow-sm dark:shadow-none">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-[#334155] mx-auto mb-4 overflow-hidden">
                <img
                  src="Vinh_Le.svg"
                  alt="Dr. Vinh Le, Instructor - OIT Administrator and Instructor at University of Nevada, Reno"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1 font-semibold">Dr. Vinh Le</h3>
              <p className="text-blue-600 dark:text-[#60a5fa] mb-2 font-medium">Instructor</p>
              <p className="text-slate-600 dark:text-[#cbd5e1]">OIT Administrator & Instructor at University of Nevada, Reno</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ RESOURCES ============ */}
      <section id="resources" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 text-center">Project Related Resources</h2>
          <p className="text-slate-600 dark:text-[#cbd5e1] text-center mb-12 max-w-2xl mx-auto">
            The following are links to resources we utilized to build our project.
          </p>

          {/* Resources List */}
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Resource Item 1 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] hover:border-blue-500 dark:hover:border-[#60a5fa] transition focus-within:ring-2 focus-within:ring-[#60a5fa] focus-within:ring-offset-2 focus-within:ring-offset-slate-50 dark:focus-within:ring-offset-slate-900">
              <a
                href="https://github.com/LaihoE/demoparser"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-[#60a5fa] hover:text-blue-800 dark:hover:text-white font-semibold text-lg mb-2 block underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b] focus:ring-[#60a5fa] rounded"
                aria-label="LaihoE/demoparser repository (opens in new window)"
              >
                LaihoE/demoparser
              </a>
              <p className="text-slate-600 dark:text-[#cbd5e1]">
                Repository coded in Rust being used to parse Counter-Strike 2 demo files.
              </p>
            </div>

            {/* Resource Item 2 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] hover:border-blue-500 dark:hover:border-[#60a5fa] transition focus-within:ring-2 focus-within:ring-[#60a5fa] focus-within:ring-offset-2 focus-within:ring-offset-slate-50 dark:focus-within:ring-offset-slate-900">
              <a
                href="https://github.com/openai/whisper"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-[#60a5fa] hover:text-blue-800 dark:hover:text-white font-semibold text-lg mb-2 block underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b] focus:ring-[#60a5fa] rounded"
                aria-label="WhisperX speech recognition model (opens in new window)"
              >
                WhisperX
              </a>
              <p className="text-slate-600 dark:text-[#cbd5e1]">
                Advanced speech recognition model for accurate audio transcription and voice analysis by OpenAI.
              </p>
            </div>

            {/* Resource Item 3 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] hover:border-blue-500 dark:hover:border-[#60a5fa] transition focus-within:ring-2 focus-within:ring-[#60a5fa] focus-within:ring-offset-2 focus-within:ring-offset-slate-50 dark:focus-within:ring-offset-slate-900">
              <a
                href="https://discord.com/developers/docs/intro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-[#60a5fa] hover:text-blue-800 dark:hover:text-white font-semibold text-lg mb-2 block underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b] focus:ring-[#60a5fa] rounded"
                aria-label="Discord API documentation (opens in new window)"
              >
                Discord API
              </a>
              <p className="text-slate-600 dark:text-[#cbd5e1]">
                Platform for building bots and integrations to sync voice communications.
              </p>
            </div>

            {/* Resource Item 4 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] hover:border-blue-500 dark:hover:border-[#60a5fa] transition focus-within:ring-2 focus-within:ring-[#60a5fa] focus-within:ring-offset-2 focus-within:ring-offset-slate-50 dark:focus-within:ring-offset-slate-900">
              <a
                href="https://github.com/SteamDatabase/Protobufs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-[#60a5fa] hover:text-blue-800 dark:hover:text-white font-semibold text-lg mb-2 block underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b] focus:ring-[#60a5fa] rounded"
                aria-label="SteamDatabase Protobufs repository (opens in new window)"
              >
                SteamDatabase/Protobufs
              </a>
              <p className="text-slate-600 dark:text-[#cbd5e1]">
                Protocol buffer definitions for Steam communications and game data structures.
              </p>
            </div>

            {/* Resource Item 5 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] hover:border-blue-500 dark:hover:border-[#60a5fa] transition focus-within:ring-2 focus-within:ring-[#60a5fa] focus-within:ring-offset-2 focus-within:ring-offset-slate-50 dark:focus-within:ring-offset-slate-900">
              <a
                href="https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-[#60a5fa] hover:text-blue-800 dark:hover:text-white font-semibold text-lg mb-2 block underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b] focus:ring-[#60a5fa] rounded"
                aria-label="NVIDIA Parakeet's Hugging Face Page (opens in new window)"
              >
                NVIDIA/Parakeet
              </a>
              <p className="text-slate-600 dark:text-[#cbd5e1]">
                A 600-million-parameter multilingual automatic speech recognition (ASR) model by NVIDIA.
              </p>
            </div>

            {/* Resource Item 6 */}
            <div className="bg-white dark:bg-[#1e293b] rounded-lg p-6 border border-slate-200 dark:border-[#334155] hover:border-blue-500 dark:hover:border-[#60a5fa] transition focus-within:ring-2 focus-within:ring-[#60a5fa] focus-within:ring-offset-2 focus-within:ring-offset-slate-50 dark:focus-within:ring-offset-slate-900">
              <a
                href="https://huggingface.co/collections/Qwen/qwen25"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-[#60a5fa] hover:text-blue-800 dark:hover:text-white font-semibold text-lg mb-2 block underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b] focus:ring-[#60a5fa] rounded"
                aria-label="Alibaba's Qwen2.5 Hugging Face Collection (opens in new window)"
              >
                Alibaba/Qwen2.5
              </a>
              <p className="text-slate-600 dark:text-[#cbd5e1]">
                A series of open-source large language models (LLMs) by Alibaba.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
