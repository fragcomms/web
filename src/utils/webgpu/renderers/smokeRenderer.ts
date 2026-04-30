import { writeFloat32Slice } from "../core/gpuBufferUtils";
import type { RenderSmokeSource } from "../types";
import { fillLocalWallScratch, type LocalWallSource } from "./effectWallCulling";
import type { WallSegment } from "./mapRenderer";

export class SmokeRenderer {
  private queue: GPUQueue;
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private smokeFieldBindGroup: GPUBindGroup;
  private wallsBindGroup: GPUBindGroup;
  private quadVertexBuffer: GPUBuffer;
  private instanceBuffer: GPUBuffer;
  private maxInstances: number;
  private instanceStrideFloats = 4;
  private instanceScratch: Float32Array;
  private wallBuffer: GPUBuffer;
  private wallScratch: Float32Array;
  private wallDistanceScratch: Float32Array;
  private wallSourceScratch: LocalWallSource[];
  private walls: WallSegment[] = [];
  private maxWallsPerInstance: number;

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    smokeFieldBindGroup: GPUBindGroup,
    wallsBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
    instanceBuffer: GPUBuffer,
    maxInstances: number,
    wallBuffer: GPUBuffer,
    maxWallsPerInstance: number,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.smokeFieldBindGroup = smokeFieldBindGroup;
    this.wallsBindGroup = wallsBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.instanceBuffer = instanceBuffer;
    this.maxInstances = maxInstances;
    this.wallBuffer = wallBuffer;
    this.maxWallsPerInstance = maxWallsPerInstance;
    this.instanceScratch = new Float32Array(this.maxInstances * this.instanceStrideFloats);
    this.wallScratch = new Float32Array(this.maxInstances * 4 + this.maxInstances * this.maxWallsPerInstance * 4);
    this.wallDistanceScratch = new Float32Array(this.maxInstances * this.maxWallsPerInstance);
    this.wallSourceScratch = Array.from({ length: this.maxInstances }, () => ({
      x: 0,
      y: 0,
      radius: 0,
      enabled: false,
    }));
  }

  setWalls(walls: WallSegment[]) {
    this.walls = walls;
  }

  upload(smokeSources: RenderSmokeSource[]) {
    const count = Math.min(smokeSources.length, this.maxInstances);
    const data = this.instanceScratch;

    for (let i = 0; i < count; i++) {
      const smoke = smokeSources[i];
      const base = i * this.instanceStrideFloats;
      data[base + 0] = smoke.x;
      data[base + 1] = smoke.y;
      data[base + 2] = smoke.radius;
      data[base + 3] = smoke.alpha;

      const wallSource = this.wallSourceScratch[i];
      wallSource.x = smoke.x;
      wallSource.y = smoke.y;
      wallSource.radius = smoke.radius;
      wallSource.enabled = smoke.alpha > 0.01;
    }

    writeFloat32Slice(this.queue, this.instanceBuffer, data, count * this.instanceStrideFloats);
    const wallFloatCount = fillLocalWallScratch(
      this.wallScratch,
      this.wallDistanceScratch,
      this.wallSourceScratch,
      count,
      this.walls,
      this.maxInstances,
      this.maxWallsPerInstance,
    );
    writeFloat32Slice(this.queue, this.wallBuffer, this.wallScratch, wallFloatCount);
    return count;
  }

  draw(pass: GPURenderPassEncoder, instanceCount: number) {
    if (instanceCount <= 0 || !this.smokeFieldBindGroup) {
      return;
    }

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setBindGroup(1, this.smokeFieldBindGroup);
    pass.setBindGroup(2, this.wallsBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.instanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }
}
