import type { WorldBounds } from "../types";
import { createWorldQuadVertices } from "../math/quadGeometry";

export class SmokeRenderer {
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private smokeFieldBindGroup: GPUBindGroup | null;
  private queue: GPUQueue;
  private quadVertexBuffer: GPUBuffer;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
  );
  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    smokeFieldBindGroupOrQuadVertexBuffer: GPUBindGroup | GPUBuffer,
    quadVertexBuffer?: GPUBuffer,
  ) {
    let smokeFieldBindGroup: GPUBindGroup | null;
    let resolvedQuadVertexBuffer: GPUBuffer;

    if (quadVertexBuffer) {
      smokeFieldBindGroup = smokeFieldBindGroupOrQuadVertexBuffer as GPUBindGroup;
      resolvedQuadVertexBuffer = quadVertexBuffer;
    } else {
      smokeFieldBindGroup = null;
      resolvedQuadVertexBuffer = smokeFieldBindGroupOrQuadVertexBuffer as GPUBuffer;
    }

    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.smokeFieldBindGroup = smokeFieldBindGroup;
    this.quadVertexBuffer = resolvedQuadVertexBuffer;
  }

  setSmokeFieldBindGroup(smokeFieldBindGroup: GPUBindGroup) {
    this.smokeFieldBindGroup = smokeFieldBindGroup;
  }

  setBounds(bounds: WorldBounds) {
    this.queue.writeBuffer(this.quadVertexBuffer, 0, createWorldQuadVertices(bounds));
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
