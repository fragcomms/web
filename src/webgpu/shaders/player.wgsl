struct Uniforms {
  viewProj : mat4x4<f32>;
};

@binding(0) @group(0) var<uniform> uniforms : Uniforms;

// Per-vertex + per-instance input
struct VertexInput {
  @location(0) a_pos      : vec2<f32>;  // quad vertex
  @location(1) i_position : vec2<f32>;  // instance position
  @location(2) i_color    : vec3<f32>;  // instance color
};

struct VertexOutput {
  @builtin(position) position : vec4<f32>;
  @location(0) color : vec3<f32>;
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var out : VertexOutput;
  let worldPos = input.a_pos + input.i_position;
  out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
  out.color = input.i_color;
  return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  return vec4<f32>(input.color, 1.0);
}
