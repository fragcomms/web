import type { RenderFrame, WorldBounds } from "../../types";
import type { FluidSimPipelineSet, FluidCheckpoint } from "./fluidTypes";

type FluidWall = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export class FluidGPU {
  private device: GPUDevice;
  private queue: GPUQueue;
  private pipelines: FluidSimPipelineSet;
  private sampleLayout: GPUBindGroupLayout;

  public readonly simResolution = 256;
  public readonly pressureIterations = 10;

  public sampleBindGroup!: GPUBindGroup;
  
  // Buffers
  private linearSampler: GPUSampler;
  private uniformBuffer: GPUBuffer;
  private sampleParamsBuffer: GPUBuffer;
  private obstacleWallBuffer: GPUBuffer;
  private playerBuffer: GPUBuffer;
  private tracerBuffer: GPUBuffer;
  private smokeBuffer: GPUBuffer;

  // Textures
  public velocityTexture!: GPUTexture;
  private velocityView!: GPUTextureView;
  private velocityScratchTexture!: GPUTexture;
  private velocityScratchView!: GPUTextureView;
  private divergenceTexture!: GPUTexture;
  private divergenceView!: GPUTextureView;
  private pressureTextureA!: GPUTexture;
  private pressureViewA!: GPUTextureView;
  private pressureTextureB!: GPUTexture;
  private pressureViewB!: GPUTextureView;
  public densityTexture!: GPUTexture;
  private densityView!: GPUTextureView;
  private densityScratchTexture!: GPUTexture;
  private densityScratchView!: GPUTextureView;
  private obstacleTexture!: GPUTexture;
  private obstacleView!: GPUTextureView;

  // BindGroups
  private obstacleBindGroup!: GPUBindGroup;
  private velocityAdvectBindGroup!: GPUBindGroup;
  private forceInjectBindGroup!: GPUBindGroup;
  private divergenceBindGroup!: GPUBindGroup;
  private pressureBindGroupAtoB!: GPUBindGroup;
  private pressureBindGroupBtoA!: GPUBindGroup;
  private projectBindGroup!: GPUBindGroup;
  private densityBindGroup!: GPUBindGroup;

  // Scratch Arrays
  private maxPlayers = 32;
  private maxTracers = 256;
  private maxSmokes = 32;
  private maxObstacleWalls = 4096;
  private playerScratch = new Float32Array(this.maxPlayers * 4);
  private tracerScratch = new Float32Array(this.maxTracers * 4);
  private smokeScratch = new Float32Array(this.maxSmokes * 4);
  private obstacleWallScratch = new Float32Array(4 + this.maxObstacleWalls * 4);
  private hasBounds = false;

  constructor(device: GPUDevice, queue: GPUQueue, pipelines: FluidSimPipelineSet, sampleLayout: GPUBindGroupLayout) {
    this.device = device;
    this.queue = queue;
    this.pipelines = pipelines;
    this.sampleLayout = sampleLayout;

    this.linearSampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

    this.uniformBuffer = device.createBuffer({ size: 12 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.sampleParamsBuffer = device.createBuffer({ size: 12 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.obstacleWallBuffer = device.createBuffer({ size: this.obstacleWallScratch.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.playerBuffer = device.createBuffer({ size: this.maxPlayers * 4 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.tracerBuffer = device.createBuffer({ size: this.maxTracers * 4 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.smokeBuffer = device.createBuffer({ size: this.maxSmokes * 4 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.queue.writeBuffer(this.obstacleWallBuffer, 0, this.obstacleWallScratch);

    this.createTextures();
    this.createBindGroups();
    this.clearObstacleTexture();
    this.clearStateTextures();
  }

  public createCheckpointTexture(): GPUTexture {
    return this.device.createTexture({
      size: [this.simResolution, this.simResolution, 1],
      format: "rgba16float",
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
    });
  }

  public writeSampleParams(bounds: WorldBounds) {
    this.hasBounds = true;
    const values = new Float32Array([bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, 0, 0, 0, 0, 0, 0, 0, 0]);
    this.queue.writeBuffer(this.sampleParamsBuffer, 0, values);
    this.rebuildObstacleMask();
  }

  public setWalls(walls: readonly FluidWall[]) {
    this.obstacleWallScratch.fill(0);
    const wallCount = Math.min(walls.length, this.maxObstacleWalls);
    this.obstacleWallScratch[0] = wallCount;

    for (let i = 0; i < wallCount; i++) {
      const wall = walls[i];
      const base = 4 + i * 4;
      this.obstacleWallScratch[base + 0] = wall.x1;
      this.obstacleWallScratch[base + 1] = wall.y1;
      this.obstacleWallScratch[base + 2] = wall.x2;
      this.obstacleWallScratch[base + 3] = wall.y2;
    }

    this.queue.writeBuffer(this.obstacleWallBuffer, 0, this.obstacleWallScratch);
    this.rebuildObstacleMask();
  }

  private rebuildObstacleMask() {
    if (!this.hasBounds || !this.obstacleBindGroup) return;

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipelines.obstaclePipeline);
    pass.setBindGroup(0, this.obstacleBindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.simResolution / 8), Math.ceil(this.simResolution / 8));
    pass.end();
    this.queue.submit([encoder.finish()]);
  }

  private writeUniforms(bounds: WorldBounds, dtSec: number, playerCount: number, tracerCount: number, smokeCount: number) {
    const values = new Float32Array([
      bounds.minX, bounds.minY, bounds.maxX, bounds.maxY,
      dtSec, playerCount, tracerCount, smokeCount,
      0.979, 150, 860, 0.9989,
    ]);
    this.queue.writeBuffer(this.uniformBuffer, 0, values);
  }

  public clearStateTextures() {
    const encoder = this.device.createCommandEncoder();
    for (const view of [this.velocityView, this.velocityScratchView, this.divergenceView, this.pressureViewA, this.pressureViewB, this.densityView, this.densityScratchView]) {
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }] });
      pass.end();
    }
    this.queue.submit([encoder.finish()]);
  }

  private clearObstacleTexture() {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.obstacleView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }] });
    pass.end();
    this.queue.submit([encoder.finish()]);
  }

  public saveCheckpoint(checkpoint: FluidCheckpoint) {
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToTexture({ texture: this.velocityTexture }, { texture: checkpoint.velocityTexture }, [this.simResolution, this.simResolution, 1]);
    encoder.copyTextureToTexture({ texture: this.densityTexture }, { texture: checkpoint.densityTexture }, [this.simResolution, this.simResolution, 1]);
    this.queue.submit([encoder.finish()]);
  }

  public loadCheckpoint(checkpoint: FluidCheckpoint) {
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToTexture({ texture: checkpoint.velocityTexture }, { texture: this.velocityTexture }, [this.simResolution, this.simResolution, 1]);
    encoder.copyTextureToTexture({ texture: checkpoint.densityTexture }, { texture: this.densityTexture }, [this.simResolution, this.simResolution, 1]);
    this.queue.submit([encoder.finish()]);
  }

  public stepPhysics(
    frame: RenderFrame, 
    dtSec: number, 
    bounds: WorldBounds, 
    previousPlayers: Map<string, { x: number; y: number }>, 
    nextPlayersScratch: Map<string, { x: number; y: number }>,
    isCatchingUp: boolean
  ) {
    this.playerScratch.fill(0);
    let playerCount = 0;
    nextPlayersScratch.clear();

    for (const player of frame.players) {
      if (!player.alive) continue;
      nextPlayersScratch.set(player.steamid, { x: player.x, y: player.y });
      if (playerCount >= this.maxPlayers) continue;

      const prev = previousPlayers.get(player.steamid);
      const vx = prev ? (player.x - prev.x) / dtSec : 0;
      const vy = prev ? (player.y - prev.y) / dtSec : 0;
      const base = playerCount * 4;
      this.playerScratch[base + 0] = player.x;
      this.playerScratch[base + 1] = player.y;
      this.playerScratch[base + 2] = vx;
      this.playerScratch[base + 3] = vy;
      playerCount++;
    }
    this.queue.writeBuffer(this.playerBuffer, 0, this.playerScratch);

    this.tracerScratch.fill(0);
    const tracerCount = Math.min(frame.tracers.length, this.maxTracers);
    for (let i = 0; i < tracerCount; i++) {
      const tracer = frame.tracers[i];
      const base = i * 4;
      this.tracerScratch[base + 0] = tracer.x0;
      this.tracerScratch[base + 1] = tracer.y0;
      this.tracerScratch[base + 2] = tracer.x1;
      this.tracerScratch[base + 3] = tracer.y1;
    }
    this.queue.writeBuffer(this.tracerBuffer, 0, this.tracerScratch);

    this.smokeScratch.fill(0);
    const smokeCount = Math.min(frame.smokeSources.length, this.maxSmokes);
    for (let i = 0; i < smokeCount; i++) {
      const smoke = frame.smokeSources[i];
      const base = i * 4;
      this.smokeScratch[base + 0] = smoke.x;
      this.smokeScratch[base + 1] = smoke.y;
      this.smokeScratch[base + 2] = smoke.radius;
      this.smokeScratch[base + 3] = smoke.alpha;
    }
    this.queue.writeBuffer(this.smokeBuffer, 0, this.smokeScratch);

    this.writeUniforms(bounds, dtSec, playerCount, tracerCount, smokeCount);

    const encoder = this.device.createCommandEncoder();

    const drawPass = (targetView: GPUTextureView, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup) => {
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: targetView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }] });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
    };

    drawPass(this.velocityScratchView, this.pipelines.velocityAdvectPipeline, this.velocityAdvectBindGroup);
    drawPass(this.velocityView, this.pipelines.forceInjectPipeline, this.forceInjectBindGroup);
    drawPass(this.divergenceView, this.pipelines.divergencePipeline, this.divergenceBindGroup);

    for (const view of [this.pressureViewA, this.pressureViewB]) {
      const clearPass = encoder.beginRenderPass({ colorAttachments: [{ view, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }] });
      clearPass.end();
    }

    const iterations = isCatchingUp ? 1 : this.pressureIterations;
    for (let i = 0; i < iterations; i++) {
      const writeToA = (iterations - 1 - i) % 2 === 0; 
      drawPass(
        writeToA ? this.pressureViewA : this.pressureViewB, 
        this.pipelines.pressureSolvePipeline, 
        writeToA ? this.pressureBindGroupBtoA : this.pressureBindGroupAtoB
      );
    }

    drawPass(this.velocityScratchView, this.pipelines.projectPipeline, this.projectBindGroup);
    encoder.copyTextureToTexture({ texture: this.velocityScratchTexture }, { texture: this.velocityTexture }, [this.simResolution, this.simResolution, 1]);

    drawPass(this.densityScratchView, this.pipelines.densityPipeline, this.densityBindGroup);
    encoder.copyTextureToTexture({ texture: this.densityScratchTexture }, { texture: this.densityTexture }, [this.simResolution, this.simResolution, 1]);

    this.queue.submit([encoder.finish()]);
  }

  private createTextures() {
    const create = () => this.device.createTexture({ size: [this.simResolution, this.simResolution, 1], format: "rgba16float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST });
    const createObstacle = () => this.device.createTexture({ size: [this.simResolution, this.simResolution, 1], format: "rgba16float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST });
    this.velocityTexture = create(); this.velocityView = this.velocityTexture.createView();
    this.velocityScratchTexture = create(); this.velocityScratchView = this.velocityScratchTexture.createView();
    this.divergenceTexture = create(); this.divergenceView = this.divergenceTexture.createView();
    this.pressureTextureA = create(); this.pressureViewA = this.pressureTextureA.createView();
    this.pressureTextureB = create(); this.pressureViewB = this.pressureTextureB.createView();
    this.densityTexture = create(); this.densityView = this.densityTexture.createView();
    this.densityScratchTexture = create(); this.densityScratchView = this.densityScratchTexture.createView();
    this.obstacleTexture = createObstacle(); this.obstacleView = this.obstacleTexture.createView();
  }

  private createBindGroups() {
    const createBG = (layout: GPUBindGroupLayout, entries: GPUBindGroupEntry[]) => this.device.createBindGroup({ layout, entries });
    this.obstacleBindGroup = createBG(this.pipelines.obstacleLayout, [ { binding: 0, resource: { buffer: this.obstacleWallBuffer } }, { binding: 1, resource: { buffer: this.sampleParamsBuffer } }, { binding: 2, resource: this.obstacleView } ]);
    this.sampleBindGroup = createBG(this.sampleLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.densityView }, { binding: 2, resource: { buffer: this.sampleParamsBuffer } }, { binding: 3, resource: this.obstacleView } ]);
    this.velocityAdvectBindGroup = createBG(this.pipelines.velocityAdvectLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.velocityView }, { binding: 2, resource: { buffer: this.uniformBuffer } }, { binding: 3, resource: this.obstacleView } ]);
    this.forceInjectBindGroup = createBG(this.pipelines.forceInjectLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.velocityScratchView }, { binding: 2, resource: { buffer: this.uniformBuffer } }, { binding: 3, resource: { buffer: this.playerBuffer } }, { binding: 4, resource: { buffer: this.tracerBuffer } }, { binding: 5, resource: { buffer: this.smokeBuffer } }, { binding: 6, resource: this.obstacleView } ]);
    this.divergenceBindGroup = createBG(this.pipelines.divergenceLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.velocityView }, { binding: 2, resource: { buffer: this.uniformBuffer } }, { binding: 3, resource: this.obstacleView } ]);
    this.pressureBindGroupAtoB = createBG(this.pipelines.pressureSolveLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.pressureViewA }, { binding: 2, resource: this.divergenceView }, { binding: 3, resource: { buffer: this.uniformBuffer } }, { binding: 4, resource: this.obstacleView } ]);
    this.pressureBindGroupBtoA = createBG(this.pipelines.pressureSolveLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.pressureViewB }, { binding: 2, resource: this.divergenceView }, { binding: 3, resource: { buffer: this.uniformBuffer } }, { binding: 4, resource: this.obstacleView } ]);
    this.projectBindGroup = createBG(this.pipelines.projectLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.velocityView }, { binding: 2, resource: this.pressureViewA }, { binding: 3, resource: { buffer: this.uniformBuffer } }, { binding: 4, resource: this.obstacleView } ]);
    this.densityBindGroup = createBG(this.pipelines.densityLayout, [ { binding: 0, resource: this.linearSampler }, { binding: 1, resource: this.densityView }, { binding: 2, resource: this.velocityView }, { binding: 3, resource: { buffer: this.uniformBuffer } }, { binding: 4, resource: { buffer: this.smokeBuffer } }, { binding: 5, resource: { buffer: this.tracerBuffer } }, { binding: 6, resource: this.obstacleView } ]);
  }
}
