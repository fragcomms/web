import { createWorldQuadVertices } from "../math/quadGeometry";
import type { WorldBounds } from "../types";

export class SmokeRenderer {
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private smokeFieldBindGroup: GPUBindGroup;
  private queue: GPUQueue;
  private quadVertexBuffer: GPUBuffer;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    smokeFieldBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.smokeFieldBindGroup = smokeFieldBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
  }

  setSmokeFieldBindGroup(smokeFieldBindGroup: GPUBindGroup) {
    this.smokeFieldBindGroup = smokeFieldBindGroup;
  }

  setBounds(bounds: WorldBounds) {
    this.queue.writeBuffer(this.quadVertexBuffer, 0, createWorldQuadVertices(bounds) as any);
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