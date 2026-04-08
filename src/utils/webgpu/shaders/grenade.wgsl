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
    @location(2) grenadeType : f32,
    @location(3) seed : f32,
};

@vertex
fn vs_main(
    @location(0) a_pos      : vec2<f32>,
    @location(1) i_position : vec2<f32>,
    @location(2) i_color    : vec3<f32>,
    @location(3) i_type     : f32,
    @location(4) i_seed     : f32,
) -> VSOut {
    var out : VSOut;

    let worldPos = a_pos + i_position;
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.color = i_color;
    out.localPos = a_pos;
    out.grenadeType = i_type;
    out.seed = i_seed;

    return out;
}

fn ringProfile(dist : f32, radius : f32, width : f32) -> f32 {
    let safeWidth = max(width, 0.001);
    let d = (dist - radius) / safeWidth;
    return exp(-d * d);
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let dist = length(input.localPos);
    let w = fwidth(dist);

    let coreRadius = 9.0;
    let coreAlpha = 1.0 - smoothstep(coreRadius - w, coreRadius + w, dist);

    var aura = 0.0;
    var glow = 0.0;
    var color = input.color;

    if (input.grenadeType < 1.5) {
        let phase = fract(uniforms.timeSec * 1.9 + input.seed);
        let phase2 = fract(uniforms.timeSec * 1.9 + input.seed + 0.46);
        let rippleRadiusA = 12.0 + phase * 34.0;
        let rippleRadiusB = 16.0 + phase2 * 30.0;
        let rippleA = ringProfile(dist, rippleRadiusA, 2.6 + phase * 2.4) * (1.0 - phase);
        let rippleB = ringProfile(dist, rippleRadiusB, 3.2 + phase2 * 2.1) * (1.0 - phase2) * 0.75;
        let pressure = max(rippleA, rippleB);
        let haze = 1.0 - smoothstep(10.0, 32.0, dist);

        aura = pressure * 0.72 + haze * 0.12;
        glow = pressure * 0.68 + haze * 0.16;
        color = mix(color, vec3<f32>(1.0, 0.86, 0.72), glow * 0.55);
    }

    let alpha = max(coreAlpha, aura);
    if (alpha <= 0.001) {
        discard;
    }

    return vec4<f32>(color * alpha + glow * 0.08, alpha);
}
