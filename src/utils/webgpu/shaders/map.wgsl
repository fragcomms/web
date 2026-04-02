struct Uniforms {
  viewProj: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> ubo: Uniforms;

struct VSOut {
  @builtin(position) position: vec4<f32>,
};

@vertex
fn vs_main(@location(0) a_pos: vec2<f32>) -> VSOut {
  var out: VSOut;
  out.position = ubo.viewProj * vec4<f32>(a_pos, 0.0, 1.0);
  return out;
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
  return vec4<f32>(0.8, 0.8, 0.8, 1.0);
}