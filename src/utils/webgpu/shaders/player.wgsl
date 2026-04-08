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
    @location(2) stress : f32,
    @location(3) seed : f32,
};

@vertex
fn vs_main(
    @location(0) a_pos      : vec2<f32>,
    @location(1) i_position : vec2<f32>,
    @location(2) i_color    : vec3<f32>,
    @location(3) i_stress   : f32,
    @location(4) i_seed     : f32,
) -> VSOut {
    var out : VSOut;

    let worldPos = a_pos + i_position;
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.color = i_color;
    out.localPos = a_pos;
    out.stress = i_stress;
    out.seed = i_seed;

    return out;
}

fn beat(phase : f32, center : f32, width : f32) -> f32 {
    let d = (phase - center) / max(width, 0.001);
    return exp(-d * d);
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let radius = 32.0;
    let dist = length(input.localPos);
    let w = fwidth(dist);
    let bodyAlpha = 1.0 - smoothstep(radius - w, radius + w, dist);
    let bodyMask = 1.0 - smoothstep(radius * 0.08, radius * 0.98, dist);

    var pulse = 0.0;
    var stress = max(input.stress, 0.0);
    if (input.stress >= 0.0) {
        let arrhythmia = smoothstep(0.45, 1.0, stress);
        let speed = mix(0.85, 2.85, stress);
        let irregular = sin(uniforms.timeSec * (1.7 + input.seed * 2.2))
            * 0.6
            + sin(uniforms.timeSec * (3.9 + input.seed * 4.6) + input.seed * 11.0)
            * 0.4;
        let warpedPhase = fract(
            uniforms.timeSec * speed
            + input.seed
            + irregular * 0.035 * arrhythmia
        );
        let firstBeat = beat(warpedPhase, 0.07, mix(0.048, 0.024, arrhythmia));
        let secondBeat = beat(
            warpedPhase,
            0.19 + irregular * 0.02 * arrhythmia,
            mix(0.085, 0.044, arrhythmia)
        ) * 0.62;
        let panicBeat = beat(
            warpedPhase,
            0.31 + irregular * 0.035 * arrhythmia,
            0.05
        ) * arrhythmia * max(0.0, irregular * 0.55 + 0.45) * 0.22;
        pulse = clamp(
            firstBeat + secondBeat + panicBeat,
            0.0,
            1.0
        );
    } else {
        stress = 0.0;
    }

    let heartbeat = pulse * mix(0.22, 0.68, stress);
    let coreGlow = bodyMask * heartbeat;
    let haloAlpha = (1.0 - smoothstep(radius + 1.0, radius + 10.5, dist))
        * 0.02
        + (1.0 - smoothstep(radius + 0.5, radius + 14.0, dist))
        * heartbeat
        * mix(0.1, 0.24, stress);
    let alpha = max(bodyAlpha, haloAlpha);

    var color = input.color;
    color = mix(color, vec3<f32>(1.0, 0.985, 0.97), heartbeat * mix(0.3, 0.72, stress));
    color = color + vec3<f32>(1.0, 0.96, 0.94) * coreGlow * mix(0.1, 0.24, stress);

    return vec4<f32>(color * alpha, alpha);
}
