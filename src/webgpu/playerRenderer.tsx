import type { RenderPlayer } from "./types";

export class PlayerRenderer {
  private queue: GPUQueue;

  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer;
  private playerInstanceBuffer: GPUBuffer;

  private maxPlayerInstances: number;
  private instanceStrideFloats = 5;

  private instanceScratch: Float32Array;

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

    this.instanceScratch = new Float32Array(
      this.maxPlayerInstances * this.instanceStrideFloats,
    );
  }

  upload(players: RenderPlayer[]): number {
    const count = Math.min(players.length, this.maxPlayerInstances);

    const ctR = 0.2,
      ctG = 0.6,
      ctB = 1.0; //counterTerrorist RGB
    const tR = 1.0,
      tG = 0.4,
      tB = 0.2; //terrorist RGB
    const dim = 0.2;

    const data = this.instanceScratch;

    for (let i = 0; i < count; i++) {
      const p = players[i];
      const base = i * this.instanceStrideFloats;

      data[base + 0] = p.x;
      data[base + 1] = p.y;

      const isCT = p.team === 3;
      const r = isCT ? ctR : tR;
      const g = isCT ? ctG : tG;
      const b = isCT ? ctB : tB;

      data[base + 2] = p.alive ? r : dim;
      data[base + 3] = p.alive ? g : dim;
      data[base + 4] = p.alive ? b : dim;
    }

    this.queue.writeBuffer(
      this.playerInstanceBuffer,
      0,
      data.buffer,
      data.byteOffset,
      count * this.instanceStrideFloats * 4,
    );
    return count;
  }

  draw(pass: GPURenderPassEncoder, instanceCount: number) {
    if (instanceCount <= 0) {
      return;
    }

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.playerInstanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }
}
