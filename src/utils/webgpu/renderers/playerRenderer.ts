import { writeFloat32Slice } from "../core/gpuBufferUtils";
import { getPlayerColor } from "../core/renderPalette";
import type { RenderPlayer } from "../types";

export class PlayerRenderer {
  private queue: GPUQueue;

  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer;
  private playerInstanceBuffer: GPUBuffer;

  private maxPlayerInstances: number;
  private instanceStrideFloats = 7;

  private instanceScratch: Float32Array;
  private deadInstanceCount = 0;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
    playerInstanceBuffer: GPUBuffer,
    maxPlayerInstances: number,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.playerInstanceBuffer = playerInstanceBuffer;
    this.maxPlayerInstances = maxPlayerInstances;

    this.instanceScratch = new Float32Array(this.maxPlayerInstances * this.instanceStrideFloats);
  }

  upload(players: RenderPlayer[], isSecondHalf: boolean): number {
    const data = this.instanceScratch;
    let count = 0;

    for (const p of players) {
      if (p.alive || count >= this.maxPlayerInstances) continue;
      this.writeInstance(data, count, p, isSecondHalf);
      count++;
    }
    this.deadInstanceCount = count;

    for (const p of players) {
      if (!p.alive || count >= this.maxPlayerInstances) continue;
      this.writeInstance(data, count, p, isSecondHalf);
      count++;
    }

    writeFloat32Slice(this.queue, this.playerInstanceBuffer, data, count * this.instanceStrideFloats);
    return count;
  }

  private writeInstance(data: Float32Array, index: number, p: RenderPlayer, isSecondHalf: boolean) {
    const base = index * this.instanceStrideFloats;

    data[base + 0] = p.x;
    data[base + 1] = p.y;

    const [r, g, b] = getPlayerColor(p.team, p.alive, isSecondHalf);
    data[base + 2] = r;
    data[base + 3] = g;
    data[base + 4] = b;
    data[base + 5] = p.alive ? 1 - Math.max(0, Math.min(100, p.hp)) / 100 : -1;
    data[base + 6] = hashSteamId(p.steamid);
  }

  draw(pass: GPURenderPassEncoder, instanceCount: number) {
    if (instanceCount <= 0) {
      return;
    }

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.playerInstanceBuffer);
    const deadCount = Math.min(this.deadInstanceCount, instanceCount);
    const aliveCount = Math.max(0, instanceCount - deadCount);
    if (deadCount > 0) {
      pass.draw(6, deadCount, 0, 0);
    }
    if (aliveCount > 0) {
      pass.draw(6, aliveCount, 0, deadCount);
    }
  }
}

function hashSteamId(steamid: string): number {
  let hash = 2166136261;
  for (let i = 0; i < steamid.length; i++) {
    hash ^= steamid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1024) / 1024;
}
