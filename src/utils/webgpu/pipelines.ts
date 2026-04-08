import playerShaderWGSL from "./shaders/player.wgsl?raw";
import grenadeShaderWGSL from "./shaders/grenade.wgsl?raw";
import areaEffectShaderWGSL from "./shaders/areaEffect.wgsl?raw";
import tracerShaderWGSL from "./shaders/tracer.wgsl?raw";
import visionShaderWGSL from "./shaders/vision.wgsl?raw";
import mapShaderWGSL from "./shaders/mapOutline.wgsl?raw";
import shardShaderWGSL from "./shaders/shard.wgsl?raw";
import mapImageShaderWGSL from "./shaders/mapImage.wgsl?raw";
import smokeFieldRenderShaderWGSL from "./shaders/smokeFieldRender.wgsl?raw";

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
      arrayStride: 7 * 4,
      stepMode: "instance",
      attributes: [
        { shaderLocation: 1, offset: 0, format: "float32x2" },
        { shaderLocation: 2, offset: 2 * 4, format: "float32x3" },
        { shaderLocation: 3, offset: 5 * 4, format: "float32" },
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

export function createGrenadePipeline(device: GPUDevice, format: GPUTextureFormat, globalLayout: GPUBindGroupLayout) {
  const module = device.createShaderModule({ code: grenadeShaderWGSL });

  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: 2 * 4,
      stepMode: "vertex",
      attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" },
      ],
    },
    {
      arrayStride: 7 * 4,
      stepMode: "instance",
      attributes: [
        { shaderLocation: 1, offset: 0, format: "float32x2" },
        { shaderLocation: 2, offset: 2 * 4, format: "float32x3" },
        { shaderLocation: 3, offset: 5 * 4, format: "float32" },
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

export function createAreaEffectPipeline(device: GPUDevice, format: GPUTextureFormat, globalLayout: GPUBindGroupLayout) {
  const module = device.createShaderModule({ code: areaEffectShaderWGSL });

  const smokeFieldLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: 2 * 4,
      stepMode: "vertex",
      attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" },
      ],
    },
    {
      arrayStride: 10 * 4,
      stepMode: "instance",
      attributes: [
        { shaderLocation: 1, offset: 0, format: "float32x2" },
        { shaderLocation: 2, offset: 2 * 4, format: "float32" },
        { shaderLocation: 3, offset: 3 * 4, format: "float32x3" },
        { shaderLocation: 4, offset: 6 * 4, format: "float32" },
        { shaderLocation: 5, offset: 7 * 4, format: "float32" },
        { shaderLocation: 6, offset: 8 * 4, format: "float32" },
        { shaderLocation: 7, offset: 9 * 4, format: "float32" },
      ],
    },
  ];

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [globalLayout, smokeFieldLayout],
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

  return { pipeline, smokeFieldLayout };
}

export function createSmokeRenderPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout,
  smokeFieldLayout: GPUBindGroupLayout,
) {
  const module = device.createShaderModule({ code: smokeFieldRenderShaderWGSL });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [globalLayout, smokeFieldLayout],
    }),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: 4 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x2" },
          { shaderLocation: 1, offset: 2 * 4, format: "float32x2" },
        ],
      }],
    },
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
    primitive: {
      topology: "triangle-list",
    },
  });

  return { pipeline };
}

export function createFluidSimPipelines(device: GPUDevice) {
  const fullscreenVertex = `
struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex : u32) -> VSOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(3.0, 1.0)
  );

  var out : VSOut;
  let pos = positions[vertexIndex];
  out.position = vec4<f32>(pos, 0.0, 1.0);
  out.uv = pos * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);
  return out;
}
`;

  const common = `
struct SimParams {
  bounds : vec4<f32>,
  control : vec4<f32>,
  tuning : vec4<f32>,
};

struct PlayerInjector {
  pos : vec2<f32>,
  vel : vec2<f32>,
};

struct TracerInjector {
  startPos : vec2<f32>,
  endPos : vec2<f32>,
};

fn clampUv(uv : vec2<f32>) -> vec2<f32> {
  return clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
}

fn worldSize(params : SimParams) -> vec2<f32> {
  return max(params.bounds.zw - params.bounds.xy, vec2<f32>(1.0, 1.0));
}

fn worldFromUv(params : SimParams, uv : vec2<f32>) -> vec2<f32> {
  let size = worldSize(params);
  return vec2<f32>(
    params.bounds.x + uv.x * size.x,
    params.bounds.w - uv.y * size.y
  );
}

fn distanceToSegment(p : vec2<f32>, a : vec2<f32>, b : vec2<f32>) -> f32 {
  let ab = b - a;
  let denom = max(dot(ab, ab), 0.0001);
  let t = clamp(dot(p - a, ab) / denom, 0.0, 1.0);
  return length(p - (a + ab * t));
}
`;

  const velocityAdvectModule = device.createShaderModule({
    code: `
${common}
${fullscreenVertex}

@group(0) @binding(0) var simSampler : sampler;
@group(0) @binding(1) var velocityTex : texture_2d<f32>;
@group(0) @binding(2) var<uniform> params : SimParams;

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
  let velocity = textureSampleLevel(velocityTex, simSampler, input.uv, 0.0).xy;
  let backUv = clampUv(input.uv - (velocity * params.control.x) / worldSize(params));
  let advected = textureSampleLevel(velocityTex, simSampler, backUv, 0.0).xy * params.tuning.x;
  return vec4<f32>(advected, 0.0, 0.0);
}
`,
  });

  const forceInjectModule = device.createShaderModule({
    code: `
${common}
${fullscreenVertex}

@group(0) @binding(0) var simSampler : sampler;
@group(0) @binding(1) var velocityTex : texture_2d<f32>;
@group(0) @binding(2) var<uniform> params : SimParams;
@group(0) @binding(3) var<storage, read> players : array<PlayerInjector>;
@group(0) @binding(4) var<storage, read> tracers : array<TracerInjector>;
@group(0) @binding(5) var<storage, read> smokes : array<vec4<f32>>;

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
  var velocity = textureSampleLevel(velocityTex, simSampler, input.uv, 0.0).xy;
  let worldPos = worldFromUv(params, input.uv);
  let smokeCount = u32(params.control.w);
  var smokeEnvelope = 0.0;

  for (var i = 0u; i < smokeCount; i = i + 1u) {
    let smoke = smokes[i];
    let dist = length(worldPos - smoke.xy);
    let envelope = 1.0 - smoothstep(smoke.z * 0.2, smoke.z * 1.45, dist);
    smokeEnvelope = max(smokeEnvelope, envelope * smoke.w);
  }

  let playerCount = u32(params.control.y);
  for (var i = 0u; i < playerCount; i = i + 1u) {
    let player = players[i];
    let speed = min(1.0, length(player.vel) / 320.0);
    if (speed < 0.01) {
      continue;
    }
    let dist = length(worldPos - player.pos);
    let influence = 1.0 - smoothstep(8.0, 120.0, dist);
    let dir = normalize(player.vel + vec2<f32>(0.0001, 0.0));
    velocity = velocity + dir * influence * speed * smokeEnvelope * params.tuning.y;
  }

  let tracerCount = u32(params.control.z);
  for (var i = 0u; i < tracerCount; i = i + 1u) {
    let tracer = tracers[i];
    let seg = tracer.endPos - tracer.startPos;
    let segLen = max(length(seg), 0.001);
    let dir = seg / segLen;
    let dist = distanceToSegment(worldPos, tracer.startPos, tracer.endPos);
    let along = clamp(dot(worldPos - tracer.startPos, dir) / segLen, -0.12, 2.7);
    let trailCenter = tracer.startPos + dir * along * segLen;
    let trailDist = length(worldPos - trailCenter);
    let wake = 1.0 - smoothstep(8.0, 152.0, trailDist);
    let outerWake = 1.0 - smoothstep(26.0, 272.0, trailDist);
    let core = 1.0 - smoothstep(1.0, 18.0, dist);
    let carry = wake * smoothstep(-0.05, 0.14, along) * (1.0 - smoothstep(0.94, 2.45, along));
    let driftCarry = outerWake * smoothstep(0.08, 0.34, along) * (1.0 - smoothstep(1.02, 3.05, along));
    let localEnvelope = max(smokeEnvelope, carry * 0.62 + driftCarry * 0.46);
    velocity = velocity + dir * (wake * 0.1 + core * 0.08 + carry * 0.72 + driftCarry * 1.08) * localEnvelope * params.tuning.z;
  }

  return vec4<f32>(velocity, 0.0, 0.0);
}
`,
  });

  const divergenceModule = device.createShaderModule({
    code: `
${common}
${fullscreenVertex}

@group(0) @binding(0) var simSampler : sampler;
@group(0) @binding(1) var velocityTex : texture_2d<f32>;
@group(0) @binding(2) var<uniform> params : SimParams;

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(velocityTex));
  let texel = vec2<f32>(1.0) / dims;

  let left = textureSampleLevel(velocityTex, simSampler, clampUv(input.uv + vec2<f32>(-texel.x, 0.0)), 0.0).xy;
  let right = textureSampleLevel(velocityTex, simSampler, clampUv(input.uv + vec2<f32>(texel.x, 0.0)), 0.0).xy;
  let up = textureSampleLevel(velocityTex, simSampler, clampUv(input.uv + vec2<f32>(0.0, -texel.y)), 0.0).xy;
  let down = textureSampleLevel(velocityTex, simSampler, clampUv(input.uv + vec2<f32>(0.0, texel.y)), 0.0).xy;

  let divergence = 0.5 * ((right.x - left.x) + (down.y - up.y));
  return vec4<f32>(divergence, 0.0, 0.0, 0.0);
}
`,
  });

  const pressureSolveModule = device.createShaderModule({
    code: `
${common}
${fullscreenVertex}

@group(0) @binding(0) var simSampler : sampler;
@group(0) @binding(1) var pressureTex : texture_2d<f32>;
@group(0) @binding(2) var divergenceTex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> params : SimParams;

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(pressureTex));
  let texel = vec2<f32>(1.0) / dims;

  let left = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(-texel.x, 0.0)), 0.0).x;
  let right = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(texel.x, 0.0)), 0.0).x;
  let up = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(0.0, -texel.y)), 0.0).x;
  let down = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(0.0, texel.y)), 0.0).x;
  let divergence = textureSampleLevel(divergenceTex, simSampler, input.uv, 0.0).x;

  let pressure = (left + right + up + down - divergence) * 0.25;
  return vec4<f32>(pressure, 0.0, 0.0, 0.0);
}
`,
  });

  const projectModule = device.createShaderModule({
    code: `
${common}
${fullscreenVertex}

@group(0) @binding(0) var simSampler : sampler;
@group(0) @binding(1) var velocityTex : texture_2d<f32>;
@group(0) @binding(2) var pressureTex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> params : SimParams;

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(pressureTex));
  let texel = vec2<f32>(1.0) / dims;

  let velocity = textureSampleLevel(velocityTex, simSampler, input.uv, 0.0).xy;
  let left = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(-texel.x, 0.0)), 0.0).x;
  let right = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(texel.x, 0.0)), 0.0).x;
  let up = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(0.0, -texel.y)), 0.0).x;
  let down = textureSampleLevel(pressureTex, simSampler, clampUv(input.uv + vec2<f32>(0.0, texel.y)), 0.0).x;

  let projected = velocity - vec2<f32>(right - left, down - up) * 0.5;
  return vec4<f32>(projected, 0.0, 0.0);
}
`,
  });

  const densityModule = device.createShaderModule({
    code: `
${common}
${fullscreenVertex}

@group(0) @binding(0) var simSampler : sampler;
@group(0) @binding(1) var densityTex : texture_2d<f32>;
@group(0) @binding(2) var velocityTex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> params : SimParams;
@group(0) @binding(4) var<storage, read> smokes : array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> tracers : array<TracerInjector>;

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
  let velocity = textureSampleLevel(velocityTex, simSampler, input.uv, 0.0).xy;
  let backUv = clampUv(input.uv - (velocity * params.control.x) / worldSize(params));
  let previousState = textureSampleLevel(densityTex, simSampler, backUv, 0.0);
  var density = previousState.x * params.tuning.w;
  var disturbance = previousState.y * 0.988;
  let worldPos = worldFromUv(params, input.uv);

  let smokeCount = u32(params.control.w);
  var sourceEnvelope = 0.0;
  var carriedWake = 0.0;
  for (var i = 0u; i < smokeCount; i = i + 1u) {
    let smoke = smokes[i];
    let dist = length(worldPos - smoke.xy);
    let source = 1.0 - smoothstep(smoke.z * 0.14, smoke.z, dist);
    let envelope = 1.0 - smoothstep(smoke.z * 0.24, smoke.z * 1.65, dist);
    density = max(density, source * smoke.w);
    sourceEnvelope = max(sourceEnvelope, envelope * smoke.w);
    disturbance = max(disturbance, envelope * smoke.w * 0.08);
  }

  let tracerCount = u32(params.control.z);
  for (var i = 0u; i < tracerCount; i = i + 1u) {
    let tracer = tracers[i];
    let seg = tracer.endPos - tracer.startPos;
    let segLen = max(length(seg), 0.001);
    let dir = seg / segLen;
    let dist = distanceToSegment(worldPos, tracer.startPos, tracer.endPos);
    let along = clamp(dot(worldPos - tracer.startPos, dir) / segLen, -0.18, 3.2);
    let trailCenter = tracer.startPos + dir * along * segLen;
    let trailDist = length(worldPos - trailCenter);
    let tube = 1.0 - smoothstep(0.7, 14.5, dist);
    let core = 1.0 - smoothstep(0.22, 5.8, dist);
    let wake = 1.0 - smoothstep(10.0, 160.0, trailDist);
    let outerWake = 1.0 - smoothstep(26.0, 290.0, trailDist);
    let carry = wake * smoothstep(-0.08, 0.14, along) * (1.0 - smoothstep(0.92, 2.55, along));
    let plume = outerWake * smoothstep(0.08, 0.28, along) * (1.0 - smoothstep(1.0, 3.35, along));
    let interaction = max(sourceEnvelope, smoothstep(0.035, 0.13, density));
    let carve = max(core, tube * 0.94);
    let trailScar = max(wake * 0.16, carry * 0.5);
    density = density * (1.0 - carve * interaction * 0.9992);
    density = density * (1.0 - trailScar * max(interaction, carry * 0.55));
    carriedWake = max(carriedWake, plume * max(interaction, carry * 0.8));
    disturbance = max(disturbance, max(carry * 0.5, plume * 0.92) * max(interaction, 0.2));
  }

  if (smokeCount == 0u) {
    density = density * 0.72;
    disturbance = disturbance * 0.7;
  } else {
    density = density * mix(0.12, 1.0, max(sourceEnvelope, carriedWake * 1.08));
    disturbance = disturbance * mix(0.72, 0.995, max(sourceEnvelope, carriedWake * 0.9));
  }

  return vec4<f32>(clamp(density, 0.0, 1.0), clamp(disturbance, 0.0, 1.0), 0.0, 1.0);
}
`,
  });

  const sampleLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const velocityAdvectLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const forceInjectLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 5, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });

  const divergenceLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const pressureSolveLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const projectLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const densityLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 5, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });

  const createPipeline = (module: GPUShaderModule, layout: GPUBindGroupLayout) => device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [layout],
    }),
    vertex: {
      module,
      entryPoint: "vs_main",
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{
        format: "rgba16float",
      }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  return {
    velocityAdvectPipeline: createPipeline(velocityAdvectModule, velocityAdvectLayout),
    forceInjectPipeline: createPipeline(forceInjectModule, forceInjectLayout),
    divergencePipeline: createPipeline(divergenceModule, divergenceLayout),
    pressureSolvePipeline: createPipeline(pressureSolveModule, pressureSolveLayout),
    projectPipeline: createPipeline(projectModule, projectLayout),
    densityPipeline: createPipeline(densityModule, densityLayout),
    sampleLayout,
    velocityAdvectLayout,
    forceInjectLayout,
    divergenceLayout,
    pressureSolveLayout,
    projectLayout,
    densityLayout,
  };
}

export function createVisionPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  globalLayout: GPUBindGroupLayout,
  smokeFieldLayout: GPUBindGroupLayout,
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
    bindGroupLayouts: [globalLayout, visionWallsLayout, smokeFieldLayout],
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
  globalLayout: GPUBindGroupLayout,
): GPURenderPipeline {
  const module = device.createShaderModule({ code: mapShaderWGSL });

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [globalLayout],
    }),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: 2 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x2" },
        ],
      }],
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{ format }],
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
