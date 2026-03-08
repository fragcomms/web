import type { RenderTracer } from "./types";

export class TracerRenderer {
  private queue: GPUQueue;

  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer;
  private tracerInstanceBuffer: GPUBuffer;

  private maxTracerInstances: number;
  private instanceStrideFloats = 8;

  private instanceScratch: Float32Array;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
    tracerInstanceBuffer: GPUBuffer,
    maxTracerInstances: number,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.tracerInstanceBuffer = tracerInstanceBuffer;
    this.maxTracerInstances = maxTracerInstances;

    this.instanceScratch = new Float32Array(
      this.maxTracerInstances * this.instanceStrideFloats,
    );
  }

  upload(tracers: RenderTracer[]): number {
    const count = Math.min(tracers.length, this.maxTracerInstances);
    const data = this.instanceScratch;

    const ctR = 0.2,
      ctG = 0.6,
      ctB = 1.0;
    const tR = 1.0,
      tG = 0.4,
      tB = 0.2;

    for (let i = 0; i < count; i++) {
      const tr = tracers[i];
      const base = i * this.instanceStrideFloats;

      const isCT = tr.team === 3;
      const r = isCT ? ctR : tR;
      const g = isCT ? ctG : tG;
      const b = isCT ? ctB : tB;

      data[base + 0] = tr.x0;
      data[base + 1] = tr.y0;
      data[base + 2] = tr.x1;
      data[base + 3] = tr.y1;
      data[base + 4] = tr.life;
      data[base + 5] = r;
      data[base + 6] = g;
      data[base + 7] = b;
    }

    this.queue.writeBuffer(
      this.tracerInstanceBuffer,
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
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.tracerInstanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }
}
