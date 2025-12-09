import { initWebGPU } from "./gpuContext";
import { createPlayerPipeline  } from "./pipelines";
import type { Frame, PlayerState } from './types';

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

    private frames: Frame[] = [];
    private startTime: number | null = null;
    private playing = false;

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
        const viewProj = new Float32Array([
            2 / 2048,0,     0, 0,
            0, -2/2048,     0, 0,
            0,       0,     1, 0,
            -1,      1,     0, 1,
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
            -4, -4,
             4, -4,
            -4,  4,
            -4,  4,
             4, -4,
             4,  4,
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

    setFrames(frames: Frame[])  {
        this.frames = frames;
    }

    play() {
        this.playing = true;
        this.startTime = performance.now();
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
        if (this.frames.length === 0) return;
        if (this.startTime == null) this.startTime = performance.now();

        const elapsedSec = (performance.now() - this.startTime) / 1000;
        //naive: pick closest frame by time
        let frame = this.frames[this.frames.length - 1];
        for (const f of this.frames) {
            if (f.time > elapsedSec) break;
            frame = f;
        }

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
        pass.draw(6, frame.players.length, 0, 0);
        pass.end();

        this.queue.submit([encoder.finish()]);
    }

    private updateInstances(players: PlayerState[]) {
        const instanceData = new Float32Array(players.length * (2 + 3));
        const stride = 5; //2 pos + 3 color

        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            const base = i * stride;
            instanceData[base + 0] = p.x;
            instanceData[base + 1] = p.y;

            const color = p.team === 0
                ? [0.2, 0.6, 1.0] //CT
                : [1.0, 0.4, 0.2]; //T
                instanceData[base + 2] = p.alive ? color[0] : 0.2;
                instanceData[base + 3] = p.alive ? color[1] : 0.2;
                instanceData[base + 4] = p.alive ? color[2] : 0.2;
        }

        this.queue.writeBuffer(
            this.instanceBuffer,
            0,
            instanceData.buffer,
            instanceData.byteOffset,
            instanceData.byteLength,
        );
    }
}