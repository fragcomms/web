struct Uniforms {
  viewProj : mat4x4<f32>,
  timeSec : f32,
  _pad0 : vec3<f32>,
};

struct WallBuffer {
  header : vec4<f32>,
  segments : array<vec4<f32>>,
};

struct SmokeFieldParams {
  mapMin : vec2<f32>,
  mapMax : vec2<f32>,
  control : vec4<f32>,
  extra : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(1) @binding(0) var<storage, read> walls : WallBuffer;
@group(2) @binding(0) var smokeSampler : sampler;
@group(2) @binding(1) var smokeField : texture_2d<f32>;
@group(2) @binding(2) var<uniform> smokeParams : SmokeFieldParams;

struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) worldPos : vec2<f32>,
  @location(1) origin : vec2<f32>,
  @location(2) facingDir : vec2<f32>,
  @location(3) color : vec3<f32>,
  @location(4) alive : f32,
  @location(5) radius : f32,
  @location(6) cosHalfFov : f32,
};

fn cross2(a : vec2<f32>, b : vec2<f32>) -> f32 {
  return a.x * b.y - a.y * b.x;
}

fn segmentBlocks(origin : vec2<f32>, fragPos : vec2<f32>, wall : vec4<f32>) -> bool {
  let p = origin;
  let r = fragPos - origin;
  let q = wall.xy;
  let s = wall.zw - wall.xy;
  let rxs = cross2(r, s);

  if (abs(rxs) < 0.0001) { return false; }

  let qp = q - p;
  let t = cross2(qp, s) / rxs;
  let u = cross2(qp, r) / rxs;

  return t >= 0.0 && t < 0.999 && u >= 0.0 && u <= 1.0;
}

@vertex
fn vs_main(
  @location(0) localPos : vec2<f32>,
  @location(1) origin : vec2<f32>,
  @location(2) facingDir : vec2<f32>,
  @location(3) color : vec3<f32>,
  @location(4) alive : f32
) -> VSOut {
  var out : VSOut;
  let radius = 800.0;
  let worldPos = origin + localPos * radius;
  out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
  out.worldPos = worldPos;
  out.origin = origin;
  out.facingDir = facingDir;
  out.color = color;
  out.alive = alive;
  out.radius = radius;
  out.cosHalfFov = cos(radians(45.0));
  return out;
}

fn smokeDensity(worldPos : vec2<f32>) -> f32 {
  let size = max(smokeParams.mapMax - smokeParams.mapMin, vec2<f32>(1.0, 1.0));
  let uv = clamp(vec2<f32>(
    (worldPos.x - smokeParams.mapMin.x) / size.x,
    (smokeParams.mapMax.y - worldPos.y) / size.y
  ), vec2<f32>(0.0), vec2<f32>(1.0));
  let density = clamp(textureSampleLevel(smokeField, smokeSampler, uv, 0.0).x, 0.0, 1.0);
  return clamp(density * 1.2, 0.0, 1.0);
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
  if (input.alive < 0.5) { discard; }

  let toFrag = input.worldPos - input.origin;
  let dist = length(toFrag);

  if (dist < 0.001 || dist > input.radius) { discard; }

  let dir = normalize(toFrag);
  if (dot(dir, input.facingDir) < input.cosHalfFov) { discard; }

  let wallCount = u32(walls.header.x);
  for (var i = 0u; i < wallCount; i = i + 1u) {
    if (segmentBlocks(input.origin, input.worldPos, walls.segments[i])) {
      discard;
    }
  }

  let wDist = fwidth(dist);
  let radialMask = 1.0 - smoothstep(input.radius - wDist, input.radius + wDist, dist);
  let falloff = 1.0 - smoothstep(0.0, input.radius, dist);
  let smoke = smokeDensity(input.worldPos);
  let scatter = smoke * pow(falloff, 0.55);

  let baseAlpha = radialMask * falloff * mix(0.18, 0.14, smoke);
  let scatterAlpha = radialMask * scatter * 0.18;
  let alpha = clamp(baseAlpha + scatterAlpha, 0.0, 0.28);
  let scatteredColor = mix(input.color, vec3<f32>(0.96, 0.97, 1.0), smoke * 0.22);
  return vec4<f32>(scatteredColor * alpha, alpha);
}
