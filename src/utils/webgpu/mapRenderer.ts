import type { MapGeometry, Segment } from "./types";

function isVisionBlocker(s: Segment): boolean {
  return s.stroke === "#3F464D" && (s.fill == null || s.fill === "none");
}

export type WallSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export class MapRenderer {
  private device: GPUDevice;
  private pipeline: GPURenderPipeline;
  private vertexBuffer: GPUBuffer | null = null;
  private vertexCount = 0;

  private blockingSegments: WallSegment[] = [];

  constructor(device: GPUDevice, pipeline: GPURenderPipeline) {
    this.device = device;
    this.pipeline = pipeline;
  }

  setMapGeometry(geometry: MapGeometry) {
    const verts = new Float32Array(geometry.segments.length * 4);
    const scale = 7.7;
    const offsetX = 400;
    const offsetY = -800;

    const centerX = (geometry.bounds.minX + geometry.bounds.maxX) / 2;
    const centerY = (geometry.bounds.minY + geometry.bounds.maxY) / 2;

    this.blockingSegments = [];

    let i = 0;

    for (const s of geometry.segments) {
      const x1 = (s.x1 - centerX) * scale + offsetX;
      const y1 = (s.y1 - centerY) * scale + offsetY;
      const x2 = (s.x2 - centerX) * scale + offsetX;
      const y2 = (s.y2 - centerY) * scale + offsetY;

      verts[i++] = x1;
      verts[i++] = y1;
      verts[i++] = x2;
      verts[i++] = y2;

      if (isVisionBlocker(s)) {
        this.blockingSegments.push({ x1, y1, x2, y2 });
      }
    }

    this.vertexCount = geometry.segments.length * 2;

    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
    }

    this.vertexBuffer = this.device.createBuffer({
      size: verts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.vertexBuffer, 0, verts);
  }

  getBlockingSegments(): WallSegment[] {
    return this.blockingSegments;
  }

  render(pass: GPURenderPassEncoder, globalBindGroup: GPUBindGroup) {
    if (!this.vertexBuffer || this.vertexCount === 0) return;

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, globalBindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertexCount);
  }
}