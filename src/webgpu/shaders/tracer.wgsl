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
    @location(1) uv : vec2<f32>,
    @location(2) life : f32,
};

@vertex
fn vs_main(
    @location(0) a_pos      : vec2<f32>,
    @location(1) i_start    : vec2<f32>,
    @location(2) i_end      : vec2<f32>,
    @location(3) i_life     : f32,
    @location(4) i_color    : vec3<f32>,
) -> VSOut {
    var out : VSOut;

    let dir = i_end - i_start;
    let len = max(length(dir), 0.0001);
    let tangent = dir / len;
    let normal = vec2<f32>(-tangent.y, tangent.x);

    let thickness = 6.0;

    let along = (a_pos.x + 1.0) * 0.5;
    let side = a_pos.y * thickness * 0.5;

    let worldPos = i_start + tangent * (along * len) + normal * side;

    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.color = i_color;
    out.uv = a_pos;
    out.life = i_life;

    return out;
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let side = abs(input.uv.y);
    let w = fwidth(side);
    let edgeMask = 1.0 - smoothstep(1.0 - w, 1.0 + w, side);

    let headFade = 0.85 + 0.15 * ((input.uv.x + 1.0) * 0.5);
    let alpha = edgeMask * input.life * headFade * 0.9;

    return vec4<f32>(input.color * alpha, alpha);
}