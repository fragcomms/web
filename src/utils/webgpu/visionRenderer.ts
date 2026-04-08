import type { RenderPlayer } from "./types";
import type { WallSegment } from "./mapRenderer";
import { getTeamColor } from "./renderPalette";
import { writeFloat32Slice } from "./gpuBufferUtils";

export class VisionRenderer {
  private queue: GPUQueue;
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private wallsBindGroup: GPUBindGroup;
  private smokeFieldBindGroup: GPUBindGroup;
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
    smokeFieldBindGroup: GPUBindGroup,
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
    this.smokeFieldBindGroup = smokeFieldBindGroup;
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

    writeFloat32Slice(this.queue, this.wallBuffer, this.wallScratch, 4 + count * 4);
  }

  upload(players: RenderPlayer[]): number {
    let count = 0;
    const data = this.instanceScratch;

    for (const p of players) {
      if (!p.alive) continue;
      if (count >= this.maxInstances) break;

      const base = count * this.instanceStrideFloats;
      const rotRad = p.rot * (Math.PI / 180);
      const [r, g, b] = getTeamColor(p.team);

      data[base + 0] = p.x;
      data[base + 1] = p.y;
      data[base + 2] = Math.cos(rotRad);
      data[base + 3] = Math.sin(rotRad);
      data[base + 4] = r;
      data[base + 5] = g;
      data[base + 6] = b;
      data[base + 7] = 1.0;
      count++;
    }

    writeFloat32Slice(this.queue, this.instanceBuffer, data, count * this.instanceStrideFloats);

    return count;
  }

  draw(pass: GPURenderPassEncoder, instanceCount: number) {
    if (instanceCount <= 0) return;

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setBindGroup(1, this.wallsBindGroup);
    pass.setBindGroup(2, this.smokeFieldBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.instanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }
}
