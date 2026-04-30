struct Uniforms {
    viewProj : mat4x4<f32>,
    timeSec : f32,
    _pad0 : vec3<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

@group(1) @binding(0) var labelSampler : sampler;
@group(1) @binding(1) var labelAtlas : texture_2d<f32>;

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
    @location(1) alpha : f32,
};

@vertex
fn vs_main(
    @location(0) localPos : vec2<f32>,
    @location(1) center : vec2<f32>,
    @location(2) size : vec2<f32>,
    @location(3) uvMin : vec2<f32>,
    @location(4) uvMax : vec2<f32>,
    @location(5) alpha : f32
) -> VSOut {
    var out : VSOut;
    let worldPos = center + localPos * size * 0.5;
    let uv01 = localPos * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.uv = mix(uvMin, uvMax, uv01);
    out.alpha = alpha;
    return out;
}

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
    let sample = textureSample(labelAtlas, labelSampler, input.uv);
    let alpha = sample.a * input.alpha;
    if (alpha < 0.01) {
        discard;
    }
    return vec4<f32>(sample.rgb * alpha, alpha);
}
