import type { RenderGrenade } from "./types";

export class GrenadeRenderer {
  private queue: GPUQueue;

  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer;
  private grenadeInstanceBuffer: GPUBuffer;

  private maxGrenadeInstances: number;
  private instanceStrideFloats = 5;

  private instanceScratch: Float32Array;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
    grenadeInstanceBuffer: GPUBuffer,
    maxGrenadeInstances: number,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.grenadeInstanceBuffer = grenadeInstanceBuffer;
    this.maxGrenadeInstances = maxGrenadeInstances;

    this.instanceScratch = new Float32Array(this.maxGrenadeInstances * this.instanceStrideFloats);
  }

  upload(grenades: RenderGrenade[]) {
    const count = Math.min(grenades.length, this.maxGrenadeInstances);
    const data = this.instanceScratch;

    for (let i = 0; i < count; i++) {
      const grenade = grenades[i];
      const base = i * this.instanceStrideFloats;
      const [r, g, b] = grenadeColor(grenade.grenadeType);

      data[base + 0] = grenade.x;
      data[base + 1] = grenade.y;
      data[base + 2] = r;
      data[base + 3] = g;
      data[base + 4] = b;
    }

    this.queue.writeBuffer(
      this.grenadeInstanceBuffer,
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
    pass.setVertexBuffer(1, this.grenadeInstanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }
}

function grenadeColor(grenadeType: number): [number, number, number] {
  switch (grenadeType) {
    case 1:
      return [0.95, 0.35, 0.25];
    case 2:
      return [0.55, 0.55, 0.58];
    case 3:
      return [0.98, 0.92, 0.42];
    case 4:
      return [0.4, 0.85, 0.95];
    case 5:
      return [1.0, 0.55, 0.15];
    default:
      return [0.9, 0.9, 0.9];
  }
}
