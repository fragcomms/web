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
  @location(1) localPos : vec2<f32>,
  @location(2) alpha : f32,
};

@vertex
fn vs_main(
  @location(0) a_pos : vec2<f32>,
  @location(1) i_position : vec2<f32>,
  @location(2) i_size : f32,
  @location(3) i_color : vec3<f32>,
  @location(4) i_alpha : f32,
) -> VSOut {
  var out : VSOut;
  let localPos = a_pos * i_size;
  let worldPos = i_position + localPos;
  out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
  out.color = i_color;
  out.localPos = a_pos;
  out.alpha = i_alpha;
  return out;
}

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
  let edge = abs(input.localPos.x) + abs(input.localPos.y);
  let feather = fwidth(edge);
  let shape = 1.0 - smoothstep(0.7 - feather, 1.0 + feather, edge);
  let alpha = shape * input.alpha;
  return vec4<f32>(input.color * alpha, alpha);
}
