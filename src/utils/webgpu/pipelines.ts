import playerShaderWGSL from "./shaders/player.wgsl?raw";
import tracerShaderWGSL from "./shaders/tracer.wgsl?raw";
import visionShaderWGSL from "./shaders/vision.wgsl?raw";
import mapShaderWGSL from "./shaders/mapOutline.wgsl?raw";
import shardShaderWGSL from "./shaders/shard.wgsl?raw";
import mapImageShaderWGSL from "./shaders/mapImage.wgsl?raw";

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

export function createPlayerPipeline(device: GPUDevice, format: GPUTextureFormat, globalLayout: GPUBindGroupLayout) {
  const module = device.createShaderModule({ code: playerShaderWGSL });

  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: 2 * 4,
      stepMode: "vertex",
      attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" },
      ],
    },
    {
      arrayStride: (2 + 3) * 4,
      stepMode: "instance",
      attributes: [
        { shaderLocation: 1, offset: 0, format: "float32x2" },
        { shaderLocation: 2, offset: 2 * 4, format: "float32x3" },
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
      targets: [{
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
      }],
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
  globalLayout: GPUBindGroupLayout
) {
  const visionWallsLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  const module = device.createShaderModule({ code: visionShaderWGSL });

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
        { shaderLocation: 3, offset: 4 * 4, format: "float32x3" },
        { shaderLocation: 4, offset: 7 * 4, format: "float32" },
      ],
    },
  ];

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [globalLayout, visionWallsLayout], // Add it back here
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module, entryPoint: "vs_main", buffers: vertexBuffers },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });

  return { pipeline, visionWallsLayout };
}

export function createTracerPipeline(device: GPUDevice, format: GPUTextureFormat, globalLayout: GPUBindGroupLayout) {
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
      targets: [{
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
      }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  return { pipeline };
}

export function createShardPipeline(device: GPUDevice, format: GPUTextureFormat, globalLayout: GPUBindGroupLayout) {
  const module = device.createShaderModule({ code: shardShaderWGSL });

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
        { shaderLocation: 1, offset: 0, format: "float32x2" },
        { shaderLocation: 2, offset: 2 * 4, format: "float32" },
        { shaderLocation: 3, offset: 3 * 4, format: "float32x3" },
        { shaderLocation: 4, offset: 6 * 4, format: "float32" },
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
      targets: [{
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
      }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  return { pipeline };
}

export function createMapPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout
): GPURenderPipeline {
  const module = device.createShaderModule({ code: mapShaderWGSL });

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [globalLayout],
    }),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [
        {
          format,
        },
      ],
    },
    primitive: {
      topology: "line-list",
    },
  });
}

export function createMapImagePipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout
) {
  const module = device.createShaderModule({ code: mapImageShaderWGSL });

  const textureBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    ],
  });

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [globalLayout, textureBindGroupLayout] }),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: 4 * 4, // X, Y, U, V
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x2" }, // Position
          { shaderLocation: 1, offset: 8, format: "float32x2" }, // UV
        ],
      }],
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        }
      }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });
}