struct Uniforms {
  viewProj : mat4x4<f32>,
  timeSec : f32,
  _pad0 : vec3<f32>,
};

struct WallBuffer {
  header : vec4<f32>,
  segments : array<vec4<f32>>,
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

@group(1) @binding(0)
var<storage, read> walls : WallBuffer;

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

  if (abs(rxs) < 0.0001) {
    return false;
  }

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

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
  if (input.alive < 0.5) {
    discard;
  }

  let toFrag = input.worldPos - input.origin;
  let dist = length(toFrag);

  if (dist < 0.001 || dist > input.radius) {
    discard;
  }

  let dir = normalize(toFrag);
  if (dot(dir, input.facingDir) < input.cosHalfFov) {
    discard;
  }

  let wallCount = u32(walls.header.x);
  for (var i = 0u; i < wallCount; i = i + 1u) {
    if (segmentBlocks(input.origin, input.worldPos, walls.segments[i])) {
      discard;
    }
  }

  let wDist = fwidth(dist);
  let radialMask = 1.0 - smoothstep(input.radius - wDist, input.radius + wDist, dist);
  let falloff = 1.0 - smoothstep(0.0, input.radius, dist);

  let alpha = radialMask * falloff * 0.18;
  return vec4<f32>(input.color * alpha, alpha);
}
