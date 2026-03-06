import type { RenderPlayer } from "./types";

export class VisionRenderer {
    private queue: GPUQueue;
    private pipeline: GPURenderPipeline;
    private globalBindGroup: GPUBindGroup;
    private quadVertexBuffer: GPUBuffer;
    private instanceBuffer: GPUBuffer;

    private maxInstances: number;
    private strideFloats = 7;
    private scratch: Float32Array;

    constructor(
        queue: GPUQueue,
        pipeline: GPURenderPipeline,
        globalBindGroup: GPUBindGroup,
        quadVertexBuffer: GPUBuffer,
        instanceBuffer: GPUBuffer,
        maxInstances: number
    ) {
        this.queue = queue;
        this.pipeline = pipeline;
        this.globalBindGroup = globalBindGroup;
        this.quadVertexBuffer = quadVertexBuffer;
        this.instanceBuffer = instanceBuffer;
        this.maxInstances = maxInstances;

        this.scratch = new Float32Array(this.maxInstances * this.strideFloats);
    }

    upload(players: RenderPlayer[]): number {
        const count = Math.min(players.length, this.maxInstances);

        const ctR = 0.2, ctG = 0.6, ctB = 1.0; //counterTerrorist RGB
        const tR = 1.0, tG = 0.4, tB = 0.2; //terrorist RGB

        const data = this.scratch;

        for (let i = 0; i < count; i++) {
            const p = players[i];
            const base = i * this.strideFloats;

            data[base + 0] = p.x;
            data[base + 1] = p.y;

            data[base + 2] = p.rot;

            const isCT = p.team === 3;
            
            data[base + 3] = isCT ? ctR : tR;
            data[base + 4] = isCT ? ctG : tG;
            data[base + 5] = isCT ? ctB : tB;

            data[base + 6] = p.alive ? 1.0 : 0.0;
        }

        this.queue.writeBuffer(
            this.instanceBuffer, 
            0,
            data.buffer,
            data.byteOffset,
            count * this.strideFloats * 4
        );
        return count;
    }

    draw(pass: GPURenderPassEncoder, instanceCount: number) {
        if (instanceCount <= 0){
            return;
        }

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.globalBindGroup);
        pass.setVertexBuffer(0, this.quadVertexBuffer);
        pass.setVertexBuffer(1, this.instanceBuffer);
        pass.draw(6, instanceCount, 0, 0);
    }
}