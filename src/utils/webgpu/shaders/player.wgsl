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
};

@vertex
fn vs_main(
    @location(0) a_pos      : vec2<f32>,
    @location(1) i_position : vec2<f32>,
    @location(2) i_color    : vec3<f32>,
) -> VSOut {
    var out : VSOut;

    let worldPos = a_pos + i_position;
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.color = i_color;

    out.localPos = a_pos;

    return out;
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let radius = 32.0;
    let dist = length(input.localPos);

    let w = fwidth(dist);

    let alpha = 1.0 - smoothstep(radius - w, radius + w, dist);

    return vec4<f32>(input.color * alpha, alpha);
}
