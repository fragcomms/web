import { createFloat32Buffer } from "../core/gpuBufferUtils";
import type { MapConfig } from "../logic/mapConfig";
import type { MapGeometry, WorldBounds } from "../types";

export type WallSegment = { x1: number; y1: number; x2: number; y2: number; };

export class MapRenderer {
  private device: GPUDevice;

  // json boundaries
  private blockingSegments: WallSegment[] = [];
  private linePipeline: GPURenderPipeline;
  private lineVertexBuffer: GPUBuffer | null = null;
  private lineVertexCount = 0;

  // svg image
  private imagePipeline: GPURenderPipeline;
  private imageVertexBuffer: GPUBuffer | null = null;
  private imageBindGroup: GPUBindGroup | null = null;
  private sampler: GPUSampler;

  public mapCenter = { x: 0, y: 0 };
  public worldBounds: WorldBounds = { minX: -4000, minY: -4000, maxX: 4000, maxY: 4000 };

  constructor(device: GPUDevice, linePipeline: GPURenderPipeline, imagePipeline: GPURenderPipeline) {
    this.device = device;
    this.linePipeline = linePipeline;
    this.imagePipeline = imagePipeline;

    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });
  }

  async loadMapImage(
    url: string,
    config: MapConfig,
    bounds: { minX: number; maxX: number; minY: number; maxY: number; },
  ) {
    const RESOLUTION = 4096;
    let svgW = 1024;
    let svgH = 1024;
    
    const bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        svgW = img.naturalWidth;
        svgH = img.naturalHeight;
        createImageBitmap(img, {
          resizeWidth: RESOLUTION,
          resizeHeight: RESOLUTION,
          resizeQuality: "high"
        })
        .then(resolve)
        .catch(reject);
      };
      img.onerror = () => reject(new Error(`Failed to load SVG: ${url}`));
      img.src = url;
    });

    const texture = this.device.createTexture({
      size: [RESOLUTION, RESOLUTION, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      [RESOLUTION, RESOLUTION],
    );

    this.imageBindGroup = this.device.createBindGroup({
      layout: this.imagePipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });

    // use original dimensions to map the UV
    const { scale, originX, originY } = config;

    const x1 = (bounds.minX * scale) + originX;
    const x2 = (bounds.maxX * scale) + originX;
    const yTop = (bounds.maxY * scale) + originY;
    const yBottom = (bounds.minY * scale) + originY;

    const u1 = bounds.minX / svgW;
    const u2 = bounds.maxX / svgW;
    const vTop = (-bounds.maxY) / svgH;
    const vBottom = (-bounds.minY) / svgH;

    const verts = new Float32Array([
      x1, yTop, u1, vTop,
      x2, yTop, u2, vTop,
      x1, yBottom, u1, vBottom,

      x1, yBottom, u1, vBottom,
      x2, yTop, u2, vTop,
      x2, yBottom, u2, vBottom,
    ]);

    if (this.imageVertexBuffer) this.imageVertexBuffer.destroy();

    this.imageVertexBuffer = createFloat32Buffer(
      this.device,
      verts,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    )

    bitmap.close();
  }

  setMapGeometry(geometry: MapGeometry, config: MapConfig) {
    const { scale, originX, originY } = config;

    const worldSize = 1024 * scale;
    this.worldBounds = {
      minX: originX,
      minY: originY - worldSize,
      maxX: originX + worldSize,
      maxY: originY,
    };

    this.mapCenter.x = originX + (worldSize / 2);
    this.mapCenter.y = originY - (worldSize / 2);

    this.blockingSegments = [];
    const lineVerts = new Float32Array(geometry.segments.length * 4);
    let lineOffset = 0;

    for (const s of geometry.segments) {
      const x1 = originX + (s.x1 * scale);
      const x2 = originX + (s.x2 * scale);

      const y1 = originY + (s.y1 * scale);
      const y2 = originY + (s.y2 * scale);

      this.blockingSegments.push({ x1, y1, x2, y2 });
      lineVerts[lineOffset + 0] = x1;
      lineVerts[lineOffset + 1] = y1;
      lineVerts[lineOffset + 2] = x2;
      lineVerts[lineOffset + 3] = y2;
      lineOffset += 4;
    }

    if (this.lineVertexBuffer) this.lineVertexBuffer.destroy();
    this.lineVertexBuffer = createFloat32Buffer(
      this.device,
      lineVerts,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );
    this.lineVertexCount = geometry.segments.length * 2;
  }

  getBlockingSegments(): WallSegment[] {
    return this.blockingSegments;
  }

  render(pass: GPURenderPassEncoder, globalBindGroup: GPUBindGroup) {
    if (this.imageVertexBuffer && this.imageBindGroup) {
      pass.setPipeline(this.imagePipeline);
      pass.setBindGroup(0, globalBindGroup);
      pass.setBindGroup(1, this.imageBindGroup);
      pass.setVertexBuffer(0, this.imageVertexBuffer);
      pass.draw(6);
      // return; // COMMENT THIS TO DEBUG WALLS
    }

    if (this.lineVertexBuffer && this.lineVertexCount > 0) {
      pass.setPipeline(this.linePipeline);
      pass.setBindGroup(0, globalBindGroup);
      pass.setVertexBuffer(0, this.lineVertexBuffer);
      pass.draw(this.lineVertexCount);
    }
  }
}
