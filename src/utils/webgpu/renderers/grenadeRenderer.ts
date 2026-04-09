import type { RenderGrenade } from "../types";
import { getGrenadeColor } from "../core/renderPalette";
import { writeFloat32Slice } from "../core/gpuBufferUtils";

export class GrenadeRenderer {
  private queue: GPUQueue;

  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer;
  private grenadeInstanceBuffer: GPUBuffer;

  private maxGrenadeInstances: number;
  private instanceStrideFloats = 7;

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
      const [r, g, b] = getGrenadeColor(grenade.grenadeType);

      data[base + 0] = grenade.x;
      data[base + 1] = grenade.y;
      data[base + 2] = r;
      data[base + 3] = g;
      data[base + 4] = b;
      data[base + 5] = grenade.grenadeType;
      data[base + 6] = (grenade.eid % 97) / 97;
    }

    writeFloat32Slice(this.queue, this.grenadeInstanceBuffer, data, count * this.instanceStrideFloats);

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
