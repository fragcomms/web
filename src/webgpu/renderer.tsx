import { initWebGPU } from "./gpuContext";
import { createGlobalLayout, createPlayerPipeline, createTracerPipeline, createVisionPipeline } from "./pipelines";
import { PlayerRenderer } from "./playerRenderer";
import { TracerRenderer } from "./tracerRenderer";
import type { RenderFrame } from "./types";
import { VisionRenderer } from "./visionRenderer";

export class Renderer {
  private device: GPUDevice;
  private queue: GPUQueue;
  private context: GPUCanvasContext;

  private globalUniformBuffer: GPUBuffer;

  private playerRenderer: PlayerRenderer;
  private visionRenderer: VisionRenderer;
  private tracerRenderer: TracerRenderer;

  private timeVec4 = new Float32Array(4);

  constructor(
    device: GPUDevice,
    queue: GPUQueue,
    context: GPUCanvasContext,
    globalUniformBuffer: GPUBuffer,
    playerRenderer: PlayerRenderer,
    visionRenderer: VisionRenderer,
    tracerRenderer: TracerRenderer,
  ) {
    this.device = device;
    this.queue = queue;
    this.context = context;
    this.globalUniformBuffer = globalUniformBuffer;
    this.playerRenderer = playerRenderer;
    this.visionRenderer = visionRenderer;
    this.tracerRenderer = tracerRenderer;
  }

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    const { device, queue, format, context } = await initWebGPU(canvas);

    const globalLayout = createGlobalLayout(device);

    const { pipeline: playerPipeline } = createPlayerPipeline(device, format, globalLayout);
    const { pipeline: visionPipeline } = createVisionPipeline(device, format, globalLayout);
    const { pipeline: tracerPipeline } = createTracerPipeline(device, format, globalLayout);

    // simple orthographic viewProj (map 0..mapSize to clip)
    const half = 3000;
    const aspect = canvas.width / canvas.height;
    const viewProj = new Float32Array([
      (1 / half) / aspect,
      0,
      0,
      0,
      0,
      -1 / half,
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
      entries: [{
        binding: 0,
        resource: { buffer: globalUniformBuffer },
      }],
    });

    const quadVerts = new Float32Array([
      -32,
      -32,
      32,
      -32,
      -32,
      32,
      -32,
      32,
      32,
      -32,
      32,
      32,
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

    // for vision
    const unitQuadVerts = new Float32Array([
      -1,
      -1,
      1,
      -1,
      -1,
      1,
      -1,
      1,
      1,
      -1,
      1,
      1,
    ]);

    const visionQuadVertexBuffer = device.createBuffer({
      size: unitQuadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(visionQuadVertexBuffer.getMappedRange()).set(unitQuadVerts);
    visionQuadVertexBuffer.unmap();

    const maxVisionInstances = 64;
    const visionInstanceStrideBytes = 7 * 4;
    const visionInstanceBuffer = device.createBuffer({
      size: maxVisionInstances * visionInstanceStrideBytes,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const visionRenderer = new VisionRenderer(
      queue,
      visionPipeline,
      globalBindGroup,
      visionQuadVertexBuffer,
      visionInstanceBuffer,
      maxVisionInstances,
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

    return new Renderer(
      device,
      queue,
      context,
      globalUniformBuffer,
      playerRenderer,
      visionRenderer,
      tracerRenderer,
    );
  }

  render(frame: RenderFrame, timeSec: number) {
    this.timeVec4[0] = timeSec;
    this.timeVec4[1] = 0;
    this.timeVec4[2] = 0;
    this.timeVec4[3] = 0;
    this.queue.writeBuffer(this.globalUniformBuffer, 64, this.timeVec4);

    const visionCount = this.visionRenderer.upload(frame.players);
    const playerCount = this.playerRenderer.upload(frame.players);
    const tracerCount = this.tracerRenderer.upload(frame.tracers);

    const encoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.05, g: 0.05, b: 0.06, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });

    this.visionRenderer.draw(pass, visionCount);
    this.tracerRenderer.draw(pass, tracerCount);
    this.playerRenderer.draw(pass, playerCount);

    pass.end();
    this.queue.submit([encoder.finish()]);
  }
}
