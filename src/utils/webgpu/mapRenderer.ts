import type { MapGeometry } from "./types";

export class MapRenderer {
  private device: GPUDevice;
  private pipeline: GPURenderPipeline;
  private vertexBuffer: GPUBuffer | null = null;
  private vertexCount = 0;

  constructor(device: GPUDevice, pipeline: GPURenderPipeline) {
    this.device = device;
    this.pipeline = pipeline;
  }

  setMapGeometry(geometry: MapGeometry) {
    const verts = new Float32Array(geometry.segments.length * 4);

    let i = 0;
    for (const s of geometry.segments) {
      verts[i++] = s.x1;
      verts[i++] = s.y1;
      verts[i++] = s.x2;
      verts[i++] = s.y2;
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

  render(pass: GPURenderPassEncoder, globalBindGroup: GPUBindGroup) {
    if (!this.vertexBuffer || this.vertexCount === 0) return;

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, globalBindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertexCount);
  }
}