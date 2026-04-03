import type { MapGeometry, Segment } from "./types";
import type { MapConfig } from "./mapConfig";

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

  public mapCenter = { x: 0, y: 0};

  setMapGeometry(geometry: MapGeometry, config: MapConfig) {
    const verts = new Float32Array(geometry.segments.length * 4);

    const { scale, originX, originY } = config;

    const svgCenterX = (geometry.bounds.minX + geometry.bounds.maxX) / 2;
    const svgCenterY = (geometry.bounds.minY + geometry.bounds.maxY) / 2;

    this.mapCenter.x = (svgCenterX * scale) + originX;
    this.mapCenter.y = (svgCenterY * scale) + originY;

    this.blockingSegments = [];

    let i = 0;

    for (const s of geometry.segments) {
      const x1 = (s.x1 * scale) + originX;
      const x2 = (s.x2 * scale) + originX;

      const y1 = (s.y1 * scale) + originY;
      const y2 = (s.y2 * scale) + originY;

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