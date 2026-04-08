import type { MapGeometry, WorldBounds } from "./types";
import type { MapConfig } from "./mapConfig";

export type WallSegment = { x1: number; y1: number; x2: number; y2: number; };

export class MapRenderer {
  private device: GPUDevice;
  
  // json boundaries
  private blockingSegments: WallSegment[] = [];

  // svg image
  private imagePipeline: GPURenderPipeline;
  private imageVertexBuffer: GPUBuffer | null = null;
  private imageBindGroup: GPUBindGroup | null = null;
  private sampler: GPUSampler;

  public mapCenter = { x: 0, y: 0 };
  public worldBounds: WorldBounds = { minX: -4000, minY: -4000, maxX: 4000, maxY: 4000 };

  constructor(device: GPUDevice, imagePipeline: GPURenderPipeline) {
    this.device = device;
    this.imagePipeline = imagePipeline;

    this.sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });
  }

  async loadMapImage(url: string, config: MapConfig, bounds: { minX: number, maxX: number, minY: number, maxY: number }) {
    const bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        createImageBitmap(img)
          .then(resolve)
          .catch(reject);
      };
      img.onerror = () => reject(new Error(`Failed to load SVG from: ${url}`));
      img.src = url;
    });

    const texture = this.device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      { source: bitmap }, 
      { texture }, 
      [bitmap.width, bitmap.height]
    );

    this.imageBindGroup = this.device.createBindGroup({
      layout: this.imagePipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });

    const { scale, originX, originY } = config;
    
    const x1 = (bounds.minX * scale) + originX;
    const x2 = (bounds.maxX * scale) + originX;
    const yTop = (bounds.maxY * scale) + originY;
    const yBottom = (bounds.minY * scale) + originY;

    const svgW = bitmap.width;
    const svgH = bitmap.height;

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
    this.imageVertexBuffer = this.device.createBuffer({
      size: verts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.imageVertexBuffer, 0, verts);
    
    bitmap.close();
  }

  setMapGeometry(geometry: MapGeometry, config: MapConfig) {
    const { scale, originX, originY } = config;

    const svgCenterX = (geometry.bounds.minX + geometry.bounds.maxX) / 2;
    const svgCenterY = (geometry.bounds.minY + geometry.bounds.maxY) / 2;

    this.mapCenter.x = (svgCenterX * scale) + originX;
    this.mapCenter.y = (svgCenterY * scale) + originY;
    this.worldBounds = {
      minX: (geometry.bounds.minX * scale) + originX,
      minY: (geometry.bounds.minY * scale) + originY,
      maxX: (geometry.bounds.maxX * scale) + originX,
      maxY: (geometry.bounds.maxY * scale) + originY,
    };

    this.blockingSegments = []; // Clear old walls

    for (const s of geometry.segments) {
      const x1 = (s.x1 * scale) + originX;
      const x2 = (s.x2 * scale) + originX;
      const y1 = (s.y1 * scale) + originY;
      const y2 = (s.y2 * scale) + originY;

      this.blockingSegments.push({ x1, y1, x2, y2 });
    }

    // console.log(`Loaded ${this.blockingSegments.length} vision-blocking walls.`);
  }

  getBlockingSegments(): WallSegment[] { return this.blockingSegments; }

  render(pass: GPURenderPassEncoder, globalBindGroup: GPUBindGroup) {
    // map portion
    if (this.imageVertexBuffer && this.imageBindGroup) {
      pass.setPipeline(this.imagePipeline);
      pass.setBindGroup(0, globalBindGroup);
      pass.setBindGroup(1, this.imageBindGroup);
      pass.setVertexBuffer(0, this.imageVertexBuffer);
      pass.draw(6);
    }

    // segments render
    // if (this.lineVertexBuffer && this.lineVertexCount > 0) {
    //   pass.setPipeline(this.linePipeline);
    //   pass.setBindGroup(0, globalBindGroup);
    //   pass.setVertexBuffer(0, this.lineVertexBuffer);
    //   pass.draw(this.lineVertexCount);
    // }
  }
}
