import { writeFloat32Slice } from "../core/gpuBufferUtils";
import type { RenderPlayer } from "../types";

type LabelMetrics = {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  widthPx: number;
  heightPx: number;
};

export class NameLabelRenderer {
  private device: GPUDevice;
  private queue: GPUQueue;
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private labelBindGroup: GPUBindGroup;
  private quadVertexBuffer: GPUBuffer;
  private instanceBuffer: GPUBuffer;
  private maxInstances: number;
  private instanceStrideFloats = 9;
  private instanceScratch: Float32Array;

  private atlasWidth = 1024;
  private atlasHeight = 512;
  private atlasTexture: GPUTexture;
  private atlasSampler: GPUSampler;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private atlasKey = "";
  private metricsBySteamId = new Map<string, LabelMetrics>();

  constructor(
    device: GPUDevice,
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    labelLayout: GPUBindGroupLayout,
    quadVertexBuffer: GPUBuffer,
    instanceBuffer: GPUBuffer,
    maxInstances: number,
  ) {
    this.device = device;
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.instanceBuffer = instanceBuffer;
    this.maxInstances = maxInstances;
    this.instanceScratch = new Float32Array(this.maxInstances * this.instanceStrideFloats);

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.atlasWidth;
    this.canvas.height = this.atlasHeight;
    this.ctx = this.canvas.getContext("2d");

    this.atlasSampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });
    this.atlasTexture = this.device.createTexture({
      size: [this.atlasWidth, this.atlasHeight, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.labelBindGroup = this.device.createBindGroup({
      layout: labelLayout,
      entries: [
        { binding: 0, resource: this.atlasSampler },
        { binding: 1, resource: this.atlasTexture.createView() },
      ],
    });
  }

  upload(players: RenderPlayer[]) {
    if (!this.ctx) return 0;

    this.rebuildAtlasIfNeeded(players);

    let count = 0;
    for (const player of players) {
      if (player.alive || count >= this.maxInstances) continue;
      if (this.writeInstance(player, count)) count++;
    }
    for (const player of players) {
      if (!player.alive || count >= this.maxInstances) continue;
      if (this.writeInstance(player, count)) count++;
    }

    writeFloat32Slice(this.queue, this.instanceBuffer, this.instanceScratch, count * this.instanceStrideFloats);
    return count;
  }

  draw(pass: GPURenderPassEncoder, instanceCount: number) {
    if (instanceCount <= 0) return;

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setBindGroup(1, this.labelBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.instanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }

  private rebuildAtlasIfNeeded(players: RenderPlayer[]) {
    const key = players
      .map((player) => `${player.steamid}:${player.name}`)
      .join("|");
    if (key === this.atlasKey) return;

    this.atlasKey = key;
    this.metricsBySteamId.clear();

    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.atlasWidth, this.atlasHeight);
    ctx.font = "700 36px Trebuchet MS, Verdana, sans-serif";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    const paddingX = 16;
    const rowHeight = 64;
    const maxLabelWidth = 360;
    let x = 0;
    let y = 0;

    for (const player of players) {
      const text = this.fitText(this.displayName(player), maxLabelWidth - paddingX * 2);
      const textWidth = Math.ceil(ctx.measureText(text).width);
      const labelWidth = Math.min(maxLabelWidth, Math.max(34, textWidth + paddingX * 2));

      if (x + labelWidth > this.atlasWidth) {
        x = 0;
        y += rowHeight;
      }
      if (y + rowHeight > this.atlasHeight) break;

      const midY = y + rowHeight * 0.5;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.82)";
      ctx.lineWidth = 8;
      ctx.strokeText(text, x + paddingX, midY);
      ctx.fillStyle = "rgba(236, 244, 255, 0.96)";
      ctx.fillText(text, x + paddingX, midY);

      this.metricsBySteamId.set(player.steamid, {
        u0: x / this.atlasWidth,
        v0: y / this.atlasHeight,
        u1: (x + labelWidth) / this.atlasWidth,
        v1: (y + rowHeight) / this.atlasHeight,
        widthPx: labelWidth,
        heightPx: rowHeight,
      });

      x += labelWidth + 4;
    }

    this.queue.copyExternalImageToTexture(
      { source: this.canvas },
      { texture: this.atlasTexture },
      { width: this.atlasWidth, height: this.atlasHeight },
    );
  }

  private writeInstance(player: RenderPlayer, index: number) {
    const metrics = this.metricsBySteamId.get(player.steamid);
    if (!metrics) return false;

    const worldHeight = player.alive ? 75 : 69;
    const worldWidth = (metrics.widthPx / Math.max(1, metrics.heightPx)) * worldHeight;
    const labelOffset = player.alive ? 86 : 80;
    const base = index * this.instanceStrideFloats;

    this.instanceScratch[base + 0] = player.x;
    this.instanceScratch[base + 1] = player.y - labelOffset;
    this.instanceScratch[base + 2] = worldWidth;
    this.instanceScratch[base + 3] = worldHeight;
    this.instanceScratch[base + 4] = metrics.u0;
    this.instanceScratch[base + 5] = metrics.v0;
    this.instanceScratch[base + 6] = metrics.u1;
    this.instanceScratch[base + 7] = metrics.v1;
    this.instanceScratch[base + 8] = player.alive ? 1 : 0.72;
    return true;
  }

  private displayName(player: RenderPlayer) {
    const name = player.name.trim();
    return name.length > 0 ? name : player.steamid;
  }

  private fitText(text: string, maxWidth: number) {
    const ctx = this.ctx;
    if (!ctx || ctx.measureText(text).width <= maxWidth) return text;

    let out = text;
    while (out.length > 2 && ctx.measureText(`${out}...`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}...`;
  }
}
