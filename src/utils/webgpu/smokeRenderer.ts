import type { WorldBounds } from "./types";

export class SmokeRenderer {
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private smokeFieldBindGroup: GPUBindGroup | null = null;
  private queue: GPUQueue;
  private quadVertexBuffer: GPUBuffer;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
  }

  setSmokeFieldBindGroup(bindGroup: GPUBindGroup) {
    this.smokeFieldBindGroup = bindGroup;
  }

  setBounds(bounds: WorldBounds) {
    const verts = new Float32Array([
      bounds.minX, bounds.minY, 0, 1,
      bounds.maxX, bounds.minY, 1, 1,
      bounds.minX, bounds.maxY, 0, 0,
      bounds.minX, bounds.maxY, 0, 0,
      bounds.maxX, bounds.minY, 1, 1,
      bounds.maxX, bounds.maxY, 1, 0,
    ]);

    this.queue.writeBuffer(this.quadVertexBuffer, 0, verts);
  }

  draw(pass: GPURenderPassEncoder) {
    if (!this.smokeFieldBindGroup) {
      return;
    }

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setBindGroup(1, this.smokeFieldBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.draw(6, 1, 0, 0);
  }
}
