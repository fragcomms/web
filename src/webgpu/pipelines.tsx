import playerShaderWGSL from "./shaders/player.wgsl?raw";
import tracerShaderWGSL from "./shaders/tracer.wgsl?raw";
import visionShaderWGSL from "./shaders/vision.wgsl?raw";
//console.log("WGSL source:\n---\n" + playerShaderWGSL + "\n---");

export function createGlobalLayout(device: GPUDevice) {
  return device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });
}

export function createPlayerPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout,
) {
  const module = device.createShaderModule({ code: playerShaderWGSL });

  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: 2 * 4,
      stepMode: "vertex",
      attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
    },
    {
      //instance vec2 position + vec3 color
      arrayStride: (2 + 3) * 4,
      stepMode: "instance",
      attributes: [
        { shaderLocation: 1, offset: 0, format: "float32x2" }, //position
        { shaderLocation: 2, offset: 2 * 4, format: "float32x3" }, //color
      ],
    },
  ];

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [globalLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: vertexBuffers,
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  return { pipeline };
}

export function createVisionPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout,
) {
  const module = device.createShaderModule({ code: visionShaderWGSL });

  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: 2 * 4,
      stepMode: "vertex",
      attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
    },
    {
      arrayStride: 7 * 4,
      stepMode: "instance",
      attributes: [
        { shaderLocation: 1, offset: 0, format: "float32x2" }, //pos
        { shaderLocation: 2, offset: 2 * 4, format: "float32" }, //rotDegree
        { shaderLocation: 3, offset: 3 * 4, format: "float32x3" }, //color
        { shaderLocation: 4, offset: 6 * 4, format: "float32" }, //alive
      ],
    },
  ];

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [globalLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: vertexBuffers,
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  return { pipeline };
}
export function createTracerPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout,
) {
  const module = device.createShaderModule({ code: tracerShaderWGSL });

  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: 2 * 4,
      stepMode: "vertex",
      attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
    },
    {
      arrayStride: 8 * 4,
      stepMode: "instance",
      attributes: [
        { shaderLocation: 1, offset: 0, format: "float32x2" },
        { shaderLocation: 2, offset: 2 * 4, format: "float32x2" },
        { shaderLocation: 3, offset: 4 * 4, format: "float32" },
        { shaderLocation: 4, offset: 5 * 4, format: "float32x3" },
      ],
    },
  ];

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [globalLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: vertexBuffers,
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  return { pipeline };
}
