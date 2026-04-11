import { writeFloat32Slice } from "../core/gpuBufferUtils";
import { getTeamColor } from "../core/renderPalette";
import { intersectRaySegment } from "../math/geometry2d";
import type { RenderTracer } from "../types";
import type { WallSegment } from "./mapRenderer";

export class TracerRenderer {
  private queue: GPUQueue;

  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer;
  private tracerInstanceBuffer: GPUBuffer;

  private maxTracerInstances: number;
  private instanceStrideFloats = 8;

  private instanceScratch: Float32Array;
  private walls: WallSegment[] = [];

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

  setWalls(walls: WallSegment[]) {
    this.walls = walls;
  }

  upload(tracers: RenderTracer[], isSecondHalf: boolean): number {
    const count = Math.min(tracers.length, this.maxTracerInstances);
    const data = this.instanceScratch;

    for (let i = 0; i < count; i++) {
      const tr = tracers[i];
      const base = i * this.instanceStrideFloats;

      const dx = tr.x1 - tr.x0;
      const dy = tr.y1 - tr.y0;
      const len = Math.hypot(dx, dy);

      let clippedX1 = tr.x1;
      let clippedY1 = tr.y1;

      if (len > 0.0001) {
        const dir = { x: dx / len, y: dy / len };
        let hitDistance = len;

        for (const wall of this.walls) {
          const t = intersectRaySegment(
            { x: tr.x0, y: tr.y0 },
            dir,
            len,
            wall,
          );
          if (t != null && t < hitDistance) {
            hitDistance = t;
          }
        }

        clippedX1 = tr.x0 + dir.x * hitDistance;
        clippedY1 = tr.y0 + dir.y * hitDistance;
      }

      const [r, g, b] = getTeamColor(tr.team, isSecondHalf);

      data[base + 0] = tr.x0;
      data[base + 1] = tr.y0;
      data[base + 2] = clippedX1;
      data[base + 3] = clippedY1;
      data[base + 4] = tr.life;
      data[base + 5] = r;
      data[base + 6] = g;
      data[base + 7] = b;
    }

    writeFloat32Slice(this.queue, this.tracerInstanceBuffer, data, count * this.instanceStrideFloats);

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
