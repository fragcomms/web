import type { RenderAreaEffect } from "./types";

export class AreaEffectRenderer {
  private queue: GPUQueue;

  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer;
  private instanceBuffer: GPUBuffer;

  private maxInstances: number;
  private instanceStrideFloats = 10;

  private instanceScratch: Float32Array;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
    instanceBuffer: GPUBuffer,
    maxInstances: number,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.instanceBuffer = instanceBuffer;
    this.maxInstances = maxInstances;
    this.instanceScratch = new Float32Array(this.maxInstances * this.instanceStrideFloats);
  }

  upload(effects: RenderAreaEffect[]) {
    const count = Math.min(effects.length, this.maxInstances);
    const data = this.instanceScratch;

    for (let i = 0; i < count; i++) {
      const effect = effects[i];
      const base = i * this.instanceStrideFloats;

      data[base + 0] = effect.x;
      data[base + 1] = effect.y;
      data[base + 2] = effect.radius;
      data[base + 3] = effect.r;
      data[base + 4] = effect.g;
      data[base + 5] = effect.b;
      data[base + 6] = effect.alpha;
      data[base + 7] = effect.softness ?? 0.5;
      data[base + 8] = effect.density ?? 1.0;
      data[base + 9] = effect.effectType ?? (effect.kind === "inferno" ? 1 : 0);
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
    if (instanceCount <= 0) {
      return;
    }

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.instanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }
}
