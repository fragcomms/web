export class AudioSyncPlayer {
  private ctx: AudioContext;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private buffers: Map<string, AudioBuffer> = new Map();
  private loadedAudioId: string | null = null;
  
  public isPlaying: boolean = false;
  public isReady: boolean = false;
  
  private syncOffsetSec: number = 0;
  private syncStartsFirst: boolean = true;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadTracks(
    audioId: string, 
    discordIds: string[], 
    apiUrl: string, 
    offsetSec: number = 0, 
    startsFirst: boolean = true
  ) {
    if (this.loadedAudioId !== audioId) {
      this.stop();
      this.sources.clear();
      this.gainNodes.clear();
      this.buffers.clear();
      this.loadedAudioId = audioId;
    }

    this.syncOffsetSec = offsetSec;
    this.syncStartsFirst = startsFirst;
    this.isReady = false;

    // If we already loaded this specific match's audio, skip fetching
    if (this.buffers.size > 0 && this.buffers.size === discordIds.length) {
      this.isReady = true;
      return;
    }

    const promises = discordIds.map(async (id) => {
      try {

        const res = await fetch(`${apiUrl}/audio/${audioId}/track/${id}`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Failed to fetch track ${id} (Status: ${res.status})`);

        const arrayBuffer = await res.arrayBuffer();
        const decodedData = await this.ctx.decodeAudioData(arrayBuffer);

        this.buffers.set(id, decodedData);
        console.log(`[Audio] Successfully decoded track for ${id}`);
      } catch (e) {
        console.error(`[Audio] Error loading track for ${id}:`, e);
      }
    });

    await Promise.all(promises);
    this.isReady = true;
    console.log(`[AudioSync] Player READY. Offset: ${this.syncOffsetSec}s | StartsFirst: ${this.syncStartsFirst}`);
  }

  /**
   * Locks all loaded tracks together and starts them at the specified second.
   */
  play(demoTimeSec: number = 0) {
    if (!this.isReady) return;
    if (this.isPlaying) this.stop();

    // Browsers suspend audio contexts until the user interacts with the page.
    if (this.ctx.state === "suspended") this.ctx.resume();

    this.sources.clear();

    const fileSeekTime = this.syncStartsFirst 
      ? demoTimeSec + this.syncOffsetSec 
      : demoTimeSec - this.syncOffsetSec;

    const shouldBeSilent = !this.syncStartsFirst && demoTimeSec < this.syncOffsetSec;

    if (shouldBeSilent || fileSeekTime < 0) return;

    // Schedule playback 50ms in the future so the CPU has time to queue all
    // tracks and hit the hardware DAC at the exact same millisecond.
    const startTime = this.ctx.currentTime + 0.05;
    let startedSources = 0;

    for (const [id, buffer] of this.buffers.entries()) {
      if (fileSeekTime >= buffer.duration) {
        continue;
      }

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
      source.start(startTime, fileSeekTime);
      this.sources.set(id, source);
      startedSources += 1;
    }

    this.isPlaying = startedSources > 0;
  }

  getLongestTrackDurationSeconds(): number {
    let longest = 0;
    for (const buffer of this.buffers.values()) {
      if (buffer.duration > longest) {
        longest = buffer.duration;
      }
    }
    return longest;
  }

  stop() {
    if (!this.isPlaying) return;

    for (const source of this.sources.values()) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore nodes that might have already finished playing
        console.log(`skip ${e}`)
      }
    }

    this.sources.clear();
    this.isPlaying = false;
  }

  // expose buffers for download
  getBuffers(): Map<string, AudioBuffer> {
    return this.buffers;
  }

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