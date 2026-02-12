import { initWebGPU } from "./gpuContext";
import { createPlayerPipeline  } from "./pipelines";
import type { ReplayJSON, TickSnapshot, PlayerState, RenderFrame, RenderPlayer } from "./types";

export class ReplayRenderer {
    private device: GPUDevice;
    private queue: GPUQueue;
    private format: GPUTextureFormat;
    private context: GPUCanvasContext;

    private pipeline: GPURenderPipeline;
    private uniformBuffer: GPUBuffer;
    private uniformBindGroup: GPUBindGroup;

    private quadVertexBuffer: GPUBuffer;
    private instanceBuffer: GPUBuffer;
    private maxInstances: number = 64; //arbitrary

    private ticks: TickSnapshot[] = [];
    private tickNums: number[] = [];
    private startTime: number | null = null;
    private playing = false;

    //frame interpolation stuff
    private startTick: number =0;
    private ticksPerSecond: number = 64; //prolly incorrect

    constructor(
        device: GPUDevice,
        queue: GPUQueue,
        format: GPUTextureFormat,
        context: GPUCanvasContext,
        pipeline: GPURenderPipeline,
        uniformBuffer: GPUBuffer,
        uniformBindGroup: GPUBindGroup,
        quadVertexBuffer: GPUBuffer,
        instanceBuffer: GPUBuffer,
    ) {
        this.device = device;
        this.queue = queue;
        this.format = format;
        this.context = context;
        this.pipeline = pipeline;
        this.uniformBuffer = uniformBuffer;
        this.uniformBindGroup = uniformBindGroup;
        this.quadVertexBuffer = quadVertexBuffer;
        this.instanceBuffer = instanceBuffer;
    }

    static async create(canvas: HTMLCanvasElement): Promise<ReplayRenderer> {
        const { device, queue, format, context } = await initWebGPU(canvas);
        const { pipeline, bindGroupLayout } = createPlayerPipeline(device, format);

        //simple orthographic viewProj (map 0..mapSize to clip)
        const half = 3000;
        const viewProj = new Float32Array([
            1 / half,0,     0, 0,
            0, -1 / half,     0, 0,
            0,       0,     1, 0,
            0,      0,     0, 1,
        ]);

        const uniformBuffer = device.createBuffer({
            size: 64, //mat4x4<f32>
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        queue.writeBuffer(uniformBuffer, 0, viewProj);

        const uniformBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer },
            }],
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

        const maxInstances = 64;
        const instanceStride = (2 + 3) * 4;
        const instanceBuffer = device.createBuffer({
            size: maxInstances * instanceStride,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        return new ReplayRenderer(
            device,
            queue,
            format,
            context,
            pipeline,
            uniformBuffer,
            uniformBindGroup,
            quadVertexBuffer,
            instanceBuffer,
        );
    }

    setReplay(data: ReplayJSON)  {
        this.ticks = data.ticks;
        this.tickNums = data.ticks.map(t => t.tick);
    }

    play() {
        if (this.ticks.length == 0) return;
        this.playing = true;
        this.startTime = performance.now();
        this.startTick = this.ticks[0].tick;
        this.loop();
    }

    pause() {
        this.playing = false;
    }

    private loop = () => {
        if (!this.playing) return;
        this.drawCurrentFrame();
        requestAnimationFrame(this.loop);
    };

    private drawCurrentFrame(){
        if (this.ticks.length === 0) return;
        if (this.startTime == null) this.startTime = performance.now();

        const elapsedSec = (performance.now() - this.startTime) / 1000;
        const targetTick = this.startTick + elapsedSec * this.ticksPerSecond;

        const bracket = this.bracketTick(targetTick);
        if (!bracket) return;

        const frame = this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
        
        this.updateInstances(frame.players);

        const encoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.05, g: 0.05, b: 0.08, a:1},
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.uniformBindGroup);
        pass.setVertexBuffer(0, this.quadVertexBuffer);
        pass.setVertexBuffer(1, this.instanceBuffer);

        const instanceCount = Math.min(frame.players.length, this.maxInstances);
        pass.draw(6, instanceCount, 0, 0);

        pass.end();
        this.queue.submit([encoder.finish()]);
    }

    private updateInstances(players: RenderPlayer[]) {
        const count = Math.min(players.length, this.maxInstances);
        const stride = 5; 
        const instanceData = new Float32Array(count * stride);
        
        const ctR = 0.2, ctG = 0.6, ctB = 1.0;
        const tR = 1.0, tG = 0.4, tB = 0.2;

        for (let i = 0; i < count; i++) {
            const p = players[i];
            const base = i * stride;
            instanceData[base + 0] = p.x;
            instanceData[base + 1] = p.y;
            
            const isCT = p.team === 3;
            const r = isCT ? ctR : tR;
            const g = isCT ? ctG : tG;
            const b = isCT ? ctB : tB;
            
            const dim = 0.2;
            instanceData[base + 2] = p.alive ? r : dim;
            instanceData[base + 3] = p.alive ? g : dim;
            instanceData[base + 4] = p.alive ? b : dim;
        }

        this.queue.writeBuffer(this.instanceBuffer, 0, instanceData);
    }

    private bracketTick(targetTick: number): { prev: TickSnapshot; next: TickSnapshot } | null {
        const n = this.tickNums.length;
        if (n === 0) return null;

        // clamp ends
        if (targetTick <= this.tickNums[0]) {
            const s = this.ticks[0];
            return { prev: s, next: s };
        }
        if (targetTick >= this.tickNums[n - 1]) {
            const s = this.ticks[n - 1];
            return { prev: s, next: s };
        }

        // lower_bound: first idx with tickNums[idx] >= targetTick
        let lo = 0;
        let hi = n - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (this.tickNums[mid] < targetTick) lo = mid + 1;
            else hi = mid;
        }

        const next = this.ticks[lo];
        const prev = this.ticks[lo - 1];
        return { prev, next };
    }

    private makeRenderFrame(targetTick: number, prev: TickSnapshot, next: TickSnapshot): RenderFrame {
        if (prev.tick === next.tick) {
            // return render players derived from prev snapshot
            const count = Math.min(prev.players.length, this.maxInstances);
            const players: RenderPlayer[] = new Array(count);
            for (let i = 0; i < count; i++) {
            const p = prev.players[i];
            players[i] = { x: p.x, y: p.y, alive: p.alive, team: p.team };
            }
            return { tick: prev.tick, players };
        }

        const denom = next.tick - prev.tick;
        const alpha = denom > 0 ? (targetTick - prev.tick) / denom : 0;

        const count = Math.min(prev.players.length, next.players.length, this.maxInstances);
        const players: RenderPlayer[] = new Array(count);

        for (let i = 0; i < count; i++) {
            const a = prev.players[i];
            const b = next.players[i];

            players[i] = {
            team: a.team,
            alive: a.alive,
            x: a.x + (b.x - a.x) * alpha,
            y: a.y + (b.y - a.y) * alpha,
            };
        }

        return { tick: targetTick, players };
    }


}