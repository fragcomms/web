struct Uniforms {
  viewProj: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> ubo: Uniforms;
@group(1) @binding(0) var mySampler: sampler;
@group(1) @binding(1) var myTexture: texture_2d<f32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@location(0) pos: vec2<f32>, @location(1) uv: vec2<f32>) -> VSOut {
  var out: VSOut;
  out.position = ubo.viewProj * vec4<f32>(pos, 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let color = textureSample(myTexture, mySampler, in.uv);
  return color;
}