import { initWebGPU } from "./gpuContext";
import {
  createGlobalLayout,
  createMapPipeline,
  createPlayerPipeline,
  createShardPipeline,
  createTracerPipeline,
  createVisionPipeline,
} from "./pipelines";
import { PlayerRenderer } from "./playerRenderer";
import { TracerRenderer } from "./tracerRenderer";
import type { MapGeometry, RenderFrame } from "./types";
import { VisionRenderer } from "./visionRenderer";
import { MapRenderer } from "./mapRenderer";
import { DeathShardRenderer } from "./deathShardRenderer";

export class Renderer {
  private device: GPUDevice;
  private queue: GPUQueue;
  private context: GPUCanvasContext;

  private globalUniformBuffer: GPUBuffer;

  private playerRenderer: PlayerRenderer;
  private visionRenderer: VisionRenderer;
  private tracerRenderer: TracerRenderer;
  private mapRenderer: MapRenderer;
  private deathShardRenderer: DeathShardRenderer;

  private timeVec4 = new Float32Array(4);
  private lastRenderTimeSec: number | null = null;

  constructor(
    device: GPUDevice,
    queue: GPUQueue,
    context: GPUCanvasContext,
    globalUniformBuffer: GPUBuffer,
    playerRenderer: PlayerRenderer,
    visionRenderer: VisionRenderer,
    tracerRenderer: TracerRenderer,
    mapRenderer: MapRenderer,
    deathShardRenderer: DeathShardRenderer,
  ) {
    this.device = device;
    this.queue = queue;
    this.context = context;
    this.globalUniformBuffer = globalUniformBuffer;
    this.playerRenderer = playerRenderer;
    this.visionRenderer = visionRenderer;
    this.tracerRenderer = tracerRenderer;
    this.mapRenderer = mapRenderer;
    this.deathShardRenderer = deathShardRenderer;
  }

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    const { device, queue, format, context } = await initWebGPU(canvas);

    const globalLayout = createGlobalLayout(device);

    const { pipeline: playerPipeline } = createPlayerPipeline(device, format, globalLayout);
    const { pipeline: visionPipeline, visionWallsLayout } = createVisionPipeline(device, format, globalLayout);
    const { pipeline: tracerPipeline } = createTracerPipeline(device, format, globalLayout);
    const { pipeline: shardPipeline } = createShardPipeline(device, format, globalLayout);
    const mapPipeline = createMapPipeline(device, format, globalLayout);

    const half = 4000;
    const aspect = canvas.width / canvas.height;
    const viewProj = new Float32Array([
      (1 / half) / aspect, 0, 0, 0,
      0, 1 / half, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);

    const globalUniformBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    queue.writeBuffer(globalUniformBuffer, 0, viewProj);

    const globalBindGroup = device.createBindGroup({
      layout: globalLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: globalUniformBuffer },
        },
      ],
    });

    const quadVerts = new Float32Array([
      -32, -32,
       32, -32,
      -32,  32,
      -32,  32,
       32, -32,
       32,  32,
    ]);

    const quadVertexBuffer = device.createBuffer({
      size: quadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(quadVertexBuffer.getMappedRange()).set(quadVerts);
    quadVertexBuffer.unmap();

    const maxPlayerInstances = 64;
    const instanceStrideBytes = 5 * 4;
    const playerInstanceBuffer = device.createBuffer({
      size: maxPlayerInstances * instanceStrideBytes,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const playerRenderer = new PlayerRenderer(
      queue,
      playerPipeline,
      globalBindGroup,
      quadVertexBuffer,
      playerInstanceBuffer,
      maxPlayerInstances,
    );

    const unitQuadVerts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const visionQuadVertexBuffer = device.createBuffer({
      size: unitQuadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(visionQuadVertexBuffer.getMappedRange()).set(unitQuadVerts);
    visionQuadVertexBuffer.unmap();

    const maxVisionInstances = 64;
    const visionInstanceStrideBytes = 8 * 4;
    const visionInstanceBuffer = device.createBuffer({
      size: maxVisionInstances * visionInstanceStrideBytes,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const maxVisionWalls = 4096;
    const visionWallBuffer = device.createBuffer({
      size: (4 + maxVisionWalls * 4) * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const visionWallsBindGroup = device.createBindGroup({
      layout: visionWallsLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: visionWallBuffer },
        },
      ],
    });

    const visionRenderer = new VisionRenderer(
      queue,
      visionPipeline,
      globalBindGroup,
      visionWallsBindGroup,
      visionQuadVertexBuffer,
      visionInstanceBuffer,
      visionWallBuffer,
      maxVisionInstances,
      maxVisionWalls,
    );

    const tracerQuadVertexBuffer = device.createBuffer({
      size: unitQuadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(tracerQuadVertexBuffer.getMappedRange()).set(unitQuadVerts);
    tracerQuadVertexBuffer.unmap();

    const maxTracerInstances = 256;
    const tracerInstanceStrideBytes = 8 * 4;
    const tracerInstanceBuffer = device.createBuffer({
      size: maxTracerInstances * tracerInstanceStrideBytes,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const tracerRenderer = new TracerRenderer(
      queue,
      tracerPipeline,
      globalBindGroup,
      tracerQuadVertexBuffer,
      tracerInstanceBuffer,
      maxTracerInstances,
    );

    const shardQuadVerts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const shardQuadVertexBuffer = device.createBuffer({
      size: shardQuadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(shardQuadVertexBuffer.getMappedRange()).set(shardQuadVerts);
    shardQuadVertexBuffer.unmap();

    const maxShards = 512;
    const shardInstanceStrideBytes = 7 * 4;
    const shardInstanceBuffer = device.createBuffer({
      size: maxShards * shardInstanceStrideBytes,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const deathShardRenderer = new DeathShardRenderer(
      queue,
      shardPipeline,
      globalBindGroup,
      shardQuadVertexBuffer,
      shardInstanceBuffer,
      maxShards,
    );

    const mapRenderer = new MapRenderer(device, mapPipeline);

    return new Renderer(
      device,
      queue,
      context,
      globalUniformBuffer,
      playerRenderer,
      visionRenderer,
      tracerRenderer,
      mapRenderer,
      deathShardRenderer,
    );
  }

  setMapGeometry(geometry: MapGeometry) {
    this.mapRenderer.setMapGeometry(geometry);
    const walls = this.mapRenderer.getBlockingSegments();
    this.visionRenderer.setWalls(walls);
    this.tracerRenderer.setWalls(walls);
    this.deathShardRenderer.setWalls(walls);
  }

  render(frame: RenderFrame, timeSec: number) {
    this.timeVec4[0] = timeSec;
    this.timeVec4[1] = 0;
    this.timeVec4[2] = 0;
    this.timeVec4[3] = 0;
    this.queue.writeBuffer(this.globalUniformBuffer, 64, this.timeVec4);

    const dtSec = this.lastRenderTimeSec == null ? 0 : Math.max(0, timeSec - this.lastRenderTimeSec);
    this.lastRenderTimeSec = timeSec;

    this.deathShardRenderer.syncDeaths(frame.players, frame.tracers);
    this.deathShardRenderer.update(dtSec);

    const visionCount = this.visionRenderer.upload(frame.players);
    const shardCount = this.deathShardRenderer.upload();
    const playerCount = this.playerRenderer.upload(frame.players);
    const tracerCount = this.tracerRenderer.upload(frame.tracers);

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.05, g: 0.05, b: 0.06, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    this.mapRenderer.render(pass, this.playerRenderer["globalBindGroup"]);
    this.visionRenderer.draw(pass, visionCount);
    this.deathShardRenderer.draw(pass, shardCount);
    this.tracerRenderer.draw(pass, tracerCount);
    this.playerRenderer.draw(pass, playerCount);

    pass.end();
    this.queue.submit([encoder.finish()]);
  }
}
