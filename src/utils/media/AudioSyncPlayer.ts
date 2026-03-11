export class AudioSyncPlayer {
  private ctx: AudioContext;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private buffers: Map<string, AudioBuffer> = new Map();
  public isPlaying: boolean = false;

  constructor() {
    // Initialize the master hardware clock
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Fetches all requested Discord ID tracks from your Express backend concurrently
   * and decodes them into raw PCM memory buffers.
   */
  async loadTracks(audioId: string, discordIds: string[], apiUrl: string) {
    // If we already loaded this specific match's audio, skip
    if (this.buffers.size > 0) return;

    const promises = discordIds.map(async (id) => {
      try {
        const res = await fetch(`${apiUrl}/audio/${audioId}/track/${id}`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Failed to fetch track ${id}`);

        const arrayBuffer = await res.arrayBuffer();
        const decodedData = await this.ctx.decodeAudioData(arrayBuffer);

        this.buffers.set(id, decodedData);
        console.log(`[Audio] Successfully decoded track for ${id}`);
      } catch (e) {
        console.error(`[Audio] Error loading track for ${id}:`, e);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Locks all loaded tracks together and starts them at the specified second.
   */
  play(seekSeconds: number = 0) {
    if (this.isPlaying) this.stop();

    // Browsers suspend audio contexts until the user interacts with the page.
    if (this.ctx.state === "suspended") this.ctx.resume();

    this.sources.clear();

    // Schedule playback 50ms in the future so the CPU has time to queue all
    // tracks and hit the hardware DAC at the exact same millisecond.
    const startTime = this.ctx.currentTime + 0.05;

    for (const [id, buffer] of this.buffers.entries()) {
      const source = this.ctx.createBufferSource();

      // Look up existing volume node, or create one if it doesn't exist yet
      let gainNode = this.gainNodes.get(id);
      if (!gainNode) {
        gainNode = this.ctx.createGain();
        gainNode.connect(this.ctx.destination);
        this.gainNodes.set(id, gainNode);
      }

      source.buffer = buffer;
      source.connect(gainNode);

      // start(whenToStartHardwareClock, whereToStartInTheFile)
      source.start(startTime, seekSeconds);
      this.sources.set(id, source);
    }

    this.isPlaying = true;
  }

  /**
   * Instantly halts all active source nodes.
   */
  stop() {
    if (!this.isPlaying) return;

    for (const source of this.sources.values()) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore nodes that might have already finished playing
        console.log(e);
      }
    }

    this.sources.clear();
    this.isPlaying = false;
  }

  /**
   * Allows the UI to mute or unmute a specific player without stopping playback.
   */
  setTrackMute(discordId: string, muted: boolean) {
    const gainNode = this.gainNodes.get(discordId);
    if (gainNode) {
      // 0 = Muted, 1 = Full Volume
      // setTargetAtTime adds a tiny 10ms crossfade to prevent audio "clicking" pops
      gainNode.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.01);
    }
  }

  /**
   * Memory cleanup for when the React component unmounts.
   */
  destroy() {
    this.stop();
    this.ctx.close();
  }
}
