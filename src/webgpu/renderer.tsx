import { initWebGPU } from "./gpuContext";
import { createGlobalLayout, createPlayerPipeline  } from "./pipelines";
import type { RenderFrame, RenderPlayer } from "./types";

export class Renderer {
    private device: GPUDevice;
    private queue: GPUQueue;
    private context: GPUCanvasContext;

    private playerPipeline: GPURenderPipeline;

    private globalUniformBuffer: GPUBuffer;
    private globalBindGroup: GPUBindGroup;

    private quadVertexBuffer: GPUBuffer;
    private playerInstanceBuffer: GPUBuffer;

    private maxPlayerInstances: number = 64;

    constructor(
        device: GPUDevice,
        queue: GPUQueue,
        context: GPUCanvasContext,
        playerPipeline: GPURenderPipeline,
        globalUniformBuffer: GPUBuffer,
        globalBindGroup: GPUBindGroup,
        quadVertexBuffer: GPUBuffer,
        playerInstanceBuffer: GPUBuffer,
        maxPlayerInstances: number
    ) {
        this.device = device;
        this.queue = queue;
        this.context = context;
        this.playerPipeline = playerPipeline;
        this.globalUniformBuffer = globalUniformBuffer;
        this.globalBindGroup = globalBindGroup;
        this.quadVertexBuffer = quadVertexBuffer;
        this.playerInstanceBuffer = playerInstanceBuffer;
        this.maxPlayerInstances = maxPlayerInstances;
    }

    static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
        const { device, queue, format, context } = await initWebGPU(canvas);

        const globalLayout = createGlobalLayout(device);

        const { pipeline } = createPlayerPipeline(device, format, globalLayout);

        //simple orthographic viewProj (map 0..mapSize to clip)
        const half = 3000;
        const viewProj = new Float32Array([
            1 / half,0,     0, 0,
            0, -1 / half,     0, 0,
            0,       0,     1, 0,
            0,      0,     0, 1,
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
        const instanceStrideBytes = (2 + 3) * 4;
        const playerInstanceBuffer = device.createBuffer({
            size: maxPlayerInstances * instanceStrideBytes,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        return new Renderer(
            device,
            queue,
            context,
            pipeline,
            globalUniformBuffer,
            globalBindGroup,
            quadVertexBuffer,
            playerInstanceBuffer,
            maxPlayerInstances
        );
    }

    render(frame: RenderFrame, timeSec: number) {
        this.queue.writeBuffer(this.globalUniformBuffer, 64, new Float32Array([timeSec]));
        const playerCount = this.uploadPlayers(frame.players);
        this.drawPlayers(playerCount);
    }

    private uploadPlayers(players: RenderPlayer[]): number {
        const count = Math.min(players.length, this.maxPlayerInstances);
        const strideFloats = 5;
        const instanceData = new Float32Array(count * strideFloats);

        const ctR = 0.2, ctG = 0.6, ctB = 1.0; //counterTerrorist RGB
        const tR = 1.0, tG = 0.4, tB = 0.2; //terrorist RGB
        const dim = 0.2;

        for (let i = 0; i < count; i++) {
            const p = players[i];
            const base = i * strideFloats;

            instanceData[base + 0] = p.x;
            instanceData[base + 1] = p.y;

            const isCT = p.team === 3;
            const r = isCT ? ctR : tR;
            const g = isCT ? ctG : tG;
            const b = isCT ? ctB : tB;

            instanceData[base + 2] = p.alive ? r : dim;
            instanceData[base + 3] = p.alive ? g: dim;
            instanceData[base + 4] = p.alive ? b : dim;
        }

        this.queue.writeBuffer(this.playerInstanceBuffer, 0, instanceData);
        return count;
    }

    private drawPlayers(instanceCount: number) {
        const encoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();
        
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1},
                loadOp: "clear",
                storeOp: "store",
            }],
        });

        pass.setPipeline(this.playerPipeline);
        pass.setBindGroup(0, this.globalBindGroup);
        pass.setVertexBuffer(0, this.quadVertexBuffer);
        pass.setVertexBuffer(1, this.playerInstanceBuffer);
        pass.draw(6, instanceCount, 0, 0);

        pass.end();
        this.queue.submit([encoder.finish()]);
    }
}