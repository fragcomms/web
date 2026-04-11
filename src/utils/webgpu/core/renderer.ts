import { FluidSim } from "../logic/fluids/fluidSim";
import { DefaultMapConfig, MapRegistry } from "../logic/mapConfig";
import { createCenteredQuadVertices, createUnitQuadVertices, createWorldQuadVertices } from "../math/quadGeometry";
import { AreaEffectRenderer } from "../renderers/areaEffectRenderer";
import { DeathShardRenderer } from "../renderers/deathShardRenderer";
import { GrenadeRenderer } from "../renderers/grenadeRenderer";
import { MapRenderer } from "../renderers/mapRenderer";
import { PlayerRenderer } from "../renderers/playerRenderer";
import { SmokeRenderer } from "../renderers/smokeRenderer";
import { TracerRenderer } from "../renderers/tracerRenderer";
import { VisionRenderer } from "../renderers/visionRenderer";
import type { MapGeometry, RenderFrame } from "../types";
import { createDynamicBuffer, createFloat32Buffer } from "./gpuBufferUtils";
import { initWebGPU } from "./gpuContext";
import {
  createAreaEffectPipeline,
  createFluidSimPipelines,
  createGlobalLayout,
  createGrenadePipeline,
  createMapImagePipeline,
  createMapPipeline,
  createPlayerPipeline,
  createShardPipeline,
  createSmokeRenderPipeline,
  createTracerPipeline,
  createVisionPipeline,
} from "./pipelines";

export class Renderer {
  private device: GPUDevice;
  private queue: GPUQueue;
  private context: GPUCanvasContext;

  private globalUniformBuffer: GPUBuffer;
  private globalBindGroup: GPUBindGroup;

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
    const sy = zoom / half;

    const viewProj = new Float32Array([
      sx,
      0,
      0,
      0,
      0,
      sy,
      0,
      0,
      0,
      0,
      1,
      0,
      -(center.x + cameraX) * sx,
      -(center.y + cameraY) * sy,
      0,
      1,
    ]);

    this.queue.writeBuffer(this.globalUniformBuffer, 0, viewProj);
  }

  constructor(
    device: GPUDevice,
    queue: GPUQueue,
    context: GPUCanvasContext,
    globalUniformBuffer: GPUBuffer,
    globalBindGroup: GPUBindGroup,
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
    this.globalBindGroup = globalBindGroup;
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
    const { pipeline: grenadePipeline } = createGrenadePipeline(device, format, globalLayout);
    const { pipeline: visionPipeline, visionWallsLayout } = createVisionPipeline(
      device,
      format,
      globalLayout,
      smokeFieldLayout,
    );
    const { pipeline: tracerPipeline } = createTracerPipeline(device, format, globalLayout);
    const { pipeline: shardPipeline } = createShardPipeline(device, format, globalLayout);
    const mapPipeline = createMapPipeline(device, format, globalLayout);
    const mapImagePipeline = createMapImagePipeline(device, format, globalLayout);

    const half = 4000;
    const aspect = canvas.width / canvas.height;
    const viewProj = new Float32Array([
      (1 / half) / aspect,
      0,
      0,
      0,
      0,
      1 / half,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
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

    const playerQuadVertexBuffer = createFloat32Buffer(
      device,
      createCenteredQuadVertices(44),
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const maxPlayerInstances = 64;
    const playerInstanceBuffer = createDynamicBuffer(
      device,
      maxPlayerInstances * 7 * 4,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const playerRenderer = new PlayerRenderer(
      queue,
      playerPipeline,
      globalBindGroup,
      playerQuadVertexBuffer,
      playerInstanceBuffer,
      maxPlayerInstances,
    );

    const grenadeQuadVertexBuffer = createFloat32Buffer(
      device,
      createCenteredQuadVertices(56),
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const maxGrenadeInstances = 128;
    const grenadeInstanceBuffer = createDynamicBuffer(
      device,
      maxGrenadeInstances * 7 * 4,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const grenadeRenderer = new GrenadeRenderer(
      queue,
      grenadePipeline,
      globalBindGroup,
      grenadeQuadVertexBuffer,
      grenadeInstanceBuffer,
      maxGrenadeInstances,
    );

    const unitQuadVertexBuffer = createFloat32Buffer(
      device,
      createUnitQuadVertices(),
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const maxAreaEffectInstances = 64;
    const areaEffectInstanceBuffer = createDynamicBuffer(
      device,
      maxAreaEffectInstances * 10 * 4,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const fluidSim = new FluidSim(
      device,
      queue,
      fluidSimPipelines,
      smokeFieldLayout,
    );

    const areaEffectRenderer = new AreaEffectRenderer(
      queue,
      areaEffectPipeline,
      globalBindGroup,
      fluidSim.getSampleBindGroup(),
      unitQuadVertexBuffer,
      areaEffectInstanceBuffer,
      maxAreaEffectInstances,
    );

    const smokeQuadVertexBuffer = createFloat32Buffer(
      device,
      createWorldQuadVertices({ minX: -4000, minY: -4000, maxX: 4000, maxY: 4000 }),
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const smokeRenderer = new SmokeRenderer(
      queue,
      smokeRenderPipeline,
      globalBindGroup,
      fluidSim.getSampleBindGroup(),
      smokeQuadVertexBuffer,
    );

    const maxVisionInstances = 64;
    const visionInstanceBuffer = createDynamicBuffer(
      device,
      maxVisionInstances * 8 * 4,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const maxVisionWalls = 4096;
    const visionWallBuffer = createDynamicBuffer(
      device,
      (4 + maxVisionWalls * 4) * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    );

    const visionWallsBindGroup = device.createBindGroup({
      layout: visionWallsLayout,
      entries: [{ binding: 0, resource: { buffer: visionWallBuffer } }],
    });

    const visionRenderer = new VisionRenderer(
      queue,
      visionPipeline,
      globalBindGroup,
      visionWallsBindGroup,
      fluidSim.getSampleBindGroup(),
      unitQuadVertexBuffer,
      visionInstanceBuffer,
      visionWallBuffer,
      maxVisionInstances,
      maxVisionWalls,
    );

    const maxTracerInstances = 256;
    const tracerInstanceBuffer = createDynamicBuffer(
      device,
      maxTracerInstances * 8 * 4,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const tracerRenderer = new TracerRenderer(
      queue,
      tracerPipeline,
      globalBindGroup,
      unitQuadVertexBuffer,
      tracerInstanceBuffer,
      maxTracerInstances,
    );

    const maxShards = 512;
    const shardInstanceBuffer = createDynamicBuffer(
      device,
      maxShards * 7 * 4,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );

    const deathShardRenderer = new DeathShardRenderer(
      queue,
      shardPipeline,
      globalBindGroup,
      unitQuadVertexBuffer,
      shardInstanceBuffer,
      maxShards,
    );

    const mapRenderer = new MapRenderer(device, mapPipeline, mapImagePipeline);

    return new Renderer(
      device,
      queue,
      context,
      globalUniformBuffer,
      globalBindGroup,
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
      console.warn(`Map config ${mapName} not found. Using de_nuke.`);
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
      sx,
      0,
      0,
      0,
      0,
      sy,
      0,
      0,
      0,
      0,
      1,
      0,
      -center.x * sx,
      -center.y * sy,
      0,
      1,
    ]);

    // 3. Upload the new camera matrix to the GPU (Offset 0)
    this.queue.writeBuffer(this.globalUniformBuffer, 0, viewProj);
  }

  render(
    frame: RenderFrame,
    timeSec: number,
    options: { 
      skipFluidSim?: boolean; 
      skipDeathShardEffects?: 
      boolean; 
      isSecondHalf?: boolean; 
    } = {},
  ) {
    const skipFluidSim = options.skipFluidSim ?? false;
    const skipDeathShardEffects = options.skipDeathShardEffects ?? false;
    const isSecondHalf = options.isSecondHalf ?? false;

    this.timeVec4[0] = timeSec;
    this.timeVec4[1] = 0;
    this.timeVec4[2] = 0;
    this.timeVec4[3] = 0;
    this.queue.writeBuffer(this.globalUniformBuffer, 64, this.timeVec4);

    const dtSec = this.lastRenderTimeSec == null ? 0 : Math.max(0, timeSec - this.lastRenderTimeSec);
    this.lastRenderTimeSec = timeSec;

    if (!skipDeathShardEffects) {
      this.deathShardRenderer.syncDeaths(frame.players, frame.tracers);
      this.deathShardRenderer.update(dtSec);
    }
    if (!skipFluidSim) {
      this.fluidSim.syncToFrame(frame);
    }
    const visionCount = this.visionRenderer.upload(frame.players, isSecondHalf);
    const shardCount = skipDeathShardEffects ? 0 : this.deathShardRenderer.upload();
    const areaEffectCount = this.areaEffectRenderer.upload(frame.areaEffects);
    const grenadeCount = this.grenadeRenderer.upload(frame.grenades);
    const playerCount = this.playerRenderer.upload(frame.players, isSecondHalf);
    const tracerCount = this.tracerRenderer.upload(frame.tracers, isSecondHalf);

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

    this.mapRenderer.render(pass, this.globalBindGroup);
    if (!skipFluidSim) {
      this.smokeRenderer.draw(pass);
    }
    this.areaEffectRenderer.draw(pass, areaEffectCount);
    this.visionRenderer.draw(pass, visionCount);
    if (!skipDeathShardEffects) {
      this.deathShardRenderer.draw(pass, shardCount);
    }
    this.grenadeRenderer.draw(pass, grenadeCount);
    this.tracerRenderer.draw(pass, tracerCount);
    this.playerRenderer.draw(pass, playerCount);

    pass.end();
    this.queue.submit([encoder.finish()]);
  }
}
