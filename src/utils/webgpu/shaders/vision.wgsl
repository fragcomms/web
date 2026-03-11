struct Uniforms {
  viewProj : mat4x4<f32>,
  timeSec : f32,
  _pad0 : vec3<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec3<f32>,
  @location(1) localPos : vec2<f32>,   // local (scaled) position in world units
  @location(2) rotRad : f32,
  @location(3) alive : f32,
};

fn wrapPi(a: f32) -> f32 {
  // map angle to [-pi, pi]
  let pi = 3.141592653589793;
  var x = a;
  // cheap wrap using mod-like behavior
  x = x + pi;
  x = x - floor(x / (2.0 * pi)) * (2.0 * pi);
  return x - pi;
}

@vertex
fn vs_main(
  @location(0) a_pos       : vec2<f32>, // unit quad in [-1,1]
  @location(1) i_position  : vec2<f32>, // world position
  @location(2) i_rotDeg    : f32,       // degrees
  @location(3) i_color     : vec3<f32>, // rgb
  @location(4) i_alive     : f32        // 1.0 or 0.0
) -> VSOut {
  var out : VSOut;

  // Cone parameters (tweak later)
  let radius = 800.0;

  let local = a_pos * radius;           // scale unit quad into world-space square
  let worldPos = i_position + local;

  out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
  out.color = i_color;
  out.localPos = local;

  // degrees -> radians
  let pi = 3.141592653589793;
  out.rotRad = i_rotDeg * (pi / 180.0);

  out.alive = i_alive;

  return out;
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
  // Cone parameters (tweak later)
  let radius = 800.0;
  let fovDeg = 90.0; // full cone angle
  let pi = 3.141592653589793;
  let halfAngle = (fovDeg * 0.5) * (pi / 180.0);

  let p = input.localPos;
  let dist = length(p);

  // Outside radius => transparent (with antialias edge)
  let wDist = fwidth(dist);
  let radialMask = 1.0 - smoothstep(radius - wDist, radius + wDist, dist);

  // Angle mask
  let ang = atan2(p.y, p.x);
  let d = abs(wrapPi(ang - input.rotRad));

  let wAng = fwidth(d);
  let angMask = 1.0 - smoothstep(halfAngle - wAng, halfAngle + wAng, d);

  let falloff = 1.0 - smoothstep(0.0, radius, dist);

  let aliveMask = select(0.0, 1.0, input.alive >= 0.5);

  let alpha = radialMask * angMask * falloff * 0.18 * aliveMask; // overall opacity

  // premultiplied alpha
  return vec4<f32>(input.color * alpha, alpha);
}