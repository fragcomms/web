import type { RenderTracer } from "./types";
import type { WallSegment } from "./mapRenderer";

type Vec2 = {
  x: number;
  y: number;
};

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function intersectRaySegment(
  rayOrigin: Vec2,
  rayDir: Vec2,
  maxDistance: number,
  seg: WallSegment,
): number | null {
  const p = rayOrigin;
  const r = rayDir;
  const q = { x: seg.x1, y: seg.y1 };
  const s = { x: seg.x2 - seg.x1, y: seg.y2 - seg.y1 };

  const rxs = cross(r, s);
  if (Math.abs(rxs) < 1e-8) {
    return null;
  }

  const qp = { x: q.x - p.x, y: q.y - p.y };
  const t = cross(qp, s) / rxs;
  const u = cross(qp, r) / rxs;

  if (t >= 0 && t <= maxDistance && u >= 0 && u <= 1) {
    return t;
  }

  return null;
}

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

  upload(tracers: RenderTracer[]): number {
    const count = Math.min(tracers.length, this.maxTracerInstances);
    const data = this.instanceScratch;

    const ctR = 0.2, ctG = 0.6, ctB = 1.0;
    const tR = 1.0, tG = 0.4, tB = 0.2;

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

      const isCT = tr.team === 3;
      const r = isCT ? ctR : tR;
      const g = isCT ? ctG : tG;
      const b = isCT ? ctB : tB;

      data[base + 0] = tr.x0;
      data[base + 1] = tr.y0;
      data[base + 2] = clippedX1;
      data[base + 3] = clippedY1;
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
