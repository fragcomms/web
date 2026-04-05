import type { RenderPlayer } from "./types";
import type { WallSegment } from "./mapRenderer";

export class VisionRenderer {
  private queue: GPUQueue;
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private wallsBindGroup: GPUBindGroup;
  private quadVertexBuffer: GPUBuffer;
  private instanceBuffer: GPUBuffer;
  private wallBuffer: GPUBuffer;

  private maxInstances: number;
  private maxWalls: number;
  private instanceStrideFloats = 8;
  private instanceScratch: Float32Array;
  private wallScratch: Float32Array;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    wallsBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
    instanceBuffer: GPUBuffer,
    wallBuffer: GPUBuffer,
    maxInstances: number,
    maxWalls: number,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.wallsBindGroup = wallsBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.instanceBuffer = instanceBuffer;
    this.wallBuffer = wallBuffer;
    this.maxInstances = maxInstances;
    this.maxWalls = maxWalls;
    this.instanceScratch = new Float32Array(this.maxInstances * this.instanceStrideFloats);
    this.wallScratch = new Float32Array(4 + this.maxWalls * 4);
  }

  setWalls(walls: WallSegment[]) {
    const count = Math.min(walls.length, this.maxWalls);
    this.wallScratch[0] = count;

    for (let i = 0; i < count; i++) {
      const wall = walls[i];
      const base = 4 + i * 4;
      this.wallScratch[base + 0] = wall.x1;
      this.wallScratch[base + 1] = wall.y1;
      this.wallScratch[base + 2] = wall.x2;
      this.wallScratch[base + 3] = wall.y2;
    }

    this.queue.writeBuffer(
      this.wallBuffer,
      0,
      this.wallScratch.buffer,
      this.wallScratch.byteOffset,
      (4 + count * 4) * 4,
    );
  }

  upload(players: RenderPlayer[]): number {
    const ctR = 0.2, ctG = 0.6, ctB = 1.0;
    const tR = 1.0, tG = 0.4, tB = 0.2;

    let count = 0;
    const data = this.instanceScratch;

    for (const p of players) {
      if (!p.alive) continue;
      if (count >= this.maxInstances) break;

      const base = count * this.instanceStrideFloats;
      const rotRad = p.rot * (Math.PI / 180);
      const isCT = p.team === 3;

      data[base + 0] = p.x;
      data[base + 1] = p.y;
      data[base + 2] = Math.cos(rotRad);
      data[base + 3] = Math.sin(rotRad);
      data[base + 4] = isCT ? ctR : tR;
      data[base + 5] = isCT ? ctG : tG;
      data[base + 6] = isCT ? ctB : tB;
      data[base + 7] = 1.0;
      count++;
    }

    this.queue.writeBuffer(
      this.instanceBuffer,
      0,
      data.buffer,
      data.byteOffset,
      count * this.instanceStrideFloats * 4,
    );

    return count;
  }

  draw(pass: GPURenderPassEncoder, instanceCount: number) {
    if (instanceCount <= 0) return;

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setBindGroup(1, this.wallsBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.instanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }
}