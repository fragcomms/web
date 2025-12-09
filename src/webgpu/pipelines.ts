import playerShaderWGSL from "./shaders/player.wgsl?raw";
console.log("WGSL source:\n---\n" + playerShaderWGSL + "\n---");


export function createPlayerPipeline(device: GPUDevice, format: GPUTextureFormat) {
    const module = device.createShaderModule({ code: playerShaderWGSL });

    const vertextBuffers: GPUVertexBufferLayout[] = [
        {
            arrayStride: 2 * 4,
            stepMode: "vertex",
            attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x2"},
            ],
        },
        {
            //instance vec2 position + vec3 color
            arrayStride: (2 + 3) * 4,
            stepMode: "instance",
            attributes: [
                { shaderLocation: 1, offset: 0, format: "float32x2"}, //position
                { shaderLocation: 2, offset: 2*4, format: "float32x3"}, //color
            ],
        },
    ];

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "uniform" },
            },
        ],
    });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    });

    const pipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module,
            entryPoint: "vs_main",
            buffers: vertextBuffers,
        },
        fragment: {
            module,
            entryPoint: "fs_main",
            targets: [{ format }],
        },
        primitive: {
            topology: "triangle-list",
        },
    });

    return { pipeline, bindGroupLayout };
}

