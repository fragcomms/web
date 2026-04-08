import { initWebGPU } from "./gpuContext";
import {
  createAreaEffectPipeline,
  createFluidSimPipelines,
  createGlobalLayout,
  // createMapPipeline,
  createMapImagePipeline,
  createPlayerPipeline,
  createShardPipeline,
  createSmokeRenderPipeline,
  createTracerPipeline,
  createVisionPipeline,
} from "./pipelines";
import { AreaEffectRenderer } from "./areaEffectRenderer";
import { GrenadeRenderer } from "./grenadeRenderer";
import { PlayerRenderer } from "./playerRenderer";
import { SmokeRenderer } from "./smokeRenderer";
import { TracerRenderer } from "./tracerRenderer";
import type { MapGeometry, RenderFrame } from "./types";
import { VisionRenderer } from "./visionRenderer";
import { MapRenderer } from "./mapRenderer";
import { DeathShardRenderer } from "./deathShardRenderer";
import { MapRegistry, DefaultMapConfig } from "./mapConfig";
import { FluidSim } from "./fluidSim";

export class Renderer {
  private device: GPUDevice;
  private queue: GPUQueue;
  private context: GPUCanvasContext;

  private globalUniformBuffer: GPUBuffer;

  private playerRenderer: PlayerRenderer;
  private grenadeRenderer: GrenadeRenderer;
  private areaEffectRenderer: AreaEffectRenderer;
  private visionRenderer: VisionRenderer;
  private tracerRenderer: TracerRenderer;
  private smokeRenderer: SmokeRenderer;
  private mapRenderer: MapRenderer;
  private deathShardRenderer: DeathShardRenderer;
  private fluidSim: FluidSim;

  private timeVec4 = new Float32Array(4);
  private lastRenderTimeSec: number | null = null;

  public getMapRenderer() {
    return this.mapRenderer;
  }

  public updateCamera(cameraX: number, cameraY: number, zoom: number) {
    const center = this.mapRenderer.mapCenter;
    const half = 4000;

    const canvas = this.context.canvas as HTMLCanvasElement;
    const aspect = canvas.width / canvas.height;

    const sx = (zoom / half) / aspect;
    const sy = (zoom / half);

    const viewProj = new Float32Array([
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, 1, 0,
      -(center.x + cameraX) * sx, -(center.y + cameraY) * sy, 0, 1,
    ]);

    this.queue.writeBuffer(this.globalUniformBuffer, 0, viewProj);
  }

  constructor(
    device: GPUDevice,
    queue: GPUQueue,
    context: GPUCanvasContext,
    globalUniformBuffer: GPUBuffer,
    playerRenderer: PlayerRenderer,
    grenadeRenderer: GrenadeRenderer,
    areaEffectRenderer: AreaEffectRenderer,
    visionRenderer: VisionRenderer,
    tracerRenderer: TracerRenderer,
    smokeRenderer: SmokeRenderer,
    mapRenderer: MapRenderer,
    deathShardRenderer: DeathShardRenderer,
    fluidSim: FluidSim,
  ) {
    this.device = device;
    this.queue = queue;
    this.context = context;
    this.globalUniformBuffer = globalUniformBuffer;
    this.playerRenderer = playerRenderer;
    this.grenadeRenderer = grenadeRenderer;
    this.areaEffectRenderer = areaEffectRenderer;
    this.visionRenderer = visionRenderer;
    this.tracerRenderer = tracerRenderer;
    this.smokeRenderer = smokeRenderer;
    this.mapRenderer = mapRenderer;
    this.deathShardRenderer = deathShardRenderer;
    this.fluidSim = fluidSim;
  }

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    const { device, queue, format, context } = await initWebGPU(canvas);

    const globalLayout = createGlobalLayout(device);

    const { pipeline: areaEffectPipeline, smokeFieldLayout } = createAreaEffectPipeline(device, format, globalLayout);
    const { pipeline: smokeRenderPipeline } = createSmokeRenderPipeline(device, format, globalLayout, smokeFieldLayout);
    const fluidSimPipelines = createFluidSimPipelines(device);
    const { pipeline: playerPipeline } = createPlayerPipeline(device, format, globalLayout);
    const { pipeline: visionPipeline, visionWallsLayout } = createVisionPipeline(device, format, globalLayout, smokeFieldLayout);
    const { pipeline: tracerPipeline } = createTracerPipeline(device, format, globalLayout);
    const { pipeline: shardPipeline } = createShardPipeline(device, format, globalLayout);
    // const mapPipeline = createMapPipeline(device, format, globalLayout);
    const mapImagePipeline = createMapImagePipeline(device, format, globalLayout);

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

    const grenadeQuadVerts = new Float32Array([
      -14, -14,
       14, -14,
      -14,  14,
      -14,  14,
       14, -14,
       14,  14,
    ]);

    const grenadeQuadVertexBuffer = device.createBuffer({
      size: grenadeQuadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(grenadeQuadVertexBuffer.getMappedRange()).set(grenadeQuadVerts);
    grenadeQuadVertexBuffer.unmap();

    const maxGrenadeInstances = 128;
    const grenadeInstanceStrideBytes = 5 * 4;
    const grenadeInstanceBuffer = device.createBuffer({
      size: maxGrenadeInstances * grenadeInstanceStrideBytes,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const grenadeRenderer = new GrenadeRenderer(
      queue,
      playerPipeline,
      globalBindGroup,
      grenadeQuadVertexBuffer,
      grenadeInstanceBuffer,
      maxGrenadeInstances,
    );

    const areaEffectQuadVerts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const areaEffectQuadVertexBuffer = device.createBuffer({
      size: areaEffectQuadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(areaEffectQuadVertexBuffer.getMappedRange()).set(areaEffectQuadVerts);
    areaEffectQuadVertexBuffer.unmap();

    const maxAreaEffectInstances = 64;
    const areaEffectInstanceStrideBytes = 10 * 4;
    const areaEffectInstanceBuffer = device.createBuffer({
      size: maxAreaEffectInstances * areaEffectInstanceStrideBytes,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const areaEffectRenderer = new AreaEffectRenderer(
      queue,
      areaEffectPipeline,
      globalBindGroup,
      areaEffectQuadVertexBuffer,
      areaEffectInstanceBuffer,
      maxAreaEffectInstances,
    );

    const fluidSim = new FluidSim(
      device,
      queue,
      fluidSimPipelines,
      smokeFieldLayout,
    );
    areaEffectRenderer.setSmokeFieldBindGroup(fluidSim.getSampleBindGroup());

    const smokeQuadVerts = new Float32Array([
      -4000, -4000, 0, 1,
       4000, -4000, 1, 1,
      -4000,  4000, 0, 0,
      -4000,  4000, 0, 0,
       4000, -4000, 1, 1,
       4000,  4000, 1, 0,
    ]);

    const smokeQuadVertexBuffer = device.createBuffer({
      size: smokeQuadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(smokeQuadVertexBuffer.getMappedRange()).set(smokeQuadVerts);
    smokeQuadVertexBuffer.unmap();

    const smokeRenderer = new SmokeRenderer(
      queue,
      smokeRenderPipeline,
      globalBindGroup,
      smokeQuadVertexBuffer,
    );
    smokeRenderer.setSmokeFieldBindGroup(fluidSim.getSampleBindGroup());

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
      entries: [{ binding: 0, resource: { buffer: visionWallBuffer } }],
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
    visionRenderer.setSmokeFieldBindGroup(fluidSim.getSampleBindGroup());

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

    const mapRenderer = new MapRenderer(device, mapImagePipeline);
    
    return new Renderer(
      device,
      queue,
      context,
      globalUniformBuffer,
      playerRenderer,
      grenadeRenderer,
      areaEffectRenderer,
      visionRenderer,
      tracerRenderer,
      smokeRenderer,
      mapRenderer,
      deathShardRenderer,
      fluidSim,
    );
  }

  setMapGeometry(geometry: MapGeometry, mapName: string) {
    const config = MapRegistry[mapName] || DefaultMapConfig;
    if (!MapRegistry[mapName]) {
      console.warn(`Map config ${mapName} not found. Using de_nuke.`)
    }

    this.mapRenderer.setMapGeometry(geometry, config);
    this.fluidSim.setBounds(this.mapRenderer.worldBounds);
    this.smokeRenderer.setBounds(this.mapRenderer.worldBounds);

    const walls = this.mapRenderer.getBlockingSegments();
    this.visionRenderer.setWalls(walls);
    this.tracerRenderer.setWalls(walls);
    this.deathShardRenderer.setWalls(walls);

    const center = this.mapRenderer.mapCenter;
    const half = 4000;

    const canvas = this.context.canvas as HTMLCanvasElement;
    const aspect = canvas.width / canvas.height;

    const sx = (1 / half) / aspect;
    const sy = 1 / half;

    const viewProj = new Float32Array([
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, 1, 0,
      -center.x * sx, -center.y * sy, 0, 1,
    ]);

    // 3. Upload the new camera matrix to the GPU (Offset 0)
    this.queue.writeBuffer(this.globalUniformBuffer, 0, viewProj);
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
    this.fluidSim.syncToFrame(frame);
    this.areaEffectRenderer.setSmokeFieldBindGroup(this.fluidSim.getSampleBindGroup());
    this.smokeRenderer.setSmokeFieldBindGroup(this.fluidSim.getSampleBindGroup());
    this.visionRenderer.setSmokeFieldBindGroup(this.fluidSim.getSampleBindGroup());
    const visionCount = this.visionRenderer.upload(frame.players);
    const shardCount = this.deathShardRenderer.upload();
    const areaEffectCount = this.areaEffectRenderer.upload(frame.areaEffects);
    const grenadeCount = this.grenadeRenderer.upload(frame.grenades);
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
    this.smokeRenderer.draw(pass);
    this.areaEffectRenderer.draw(pass, areaEffectCount);
    this.visionRenderer.draw(pass, visionCount);
    this.deathShardRenderer.draw(pass, shardCount);
    this.grenadeRenderer.draw(pass, grenadeCount);
    this.tracerRenderer.draw(pass, tracerCount);
    this.playerRenderer.draw(pass, playerCount);

    pass.end();
    this.queue.submit([encoder.finish()]);
  }
}
