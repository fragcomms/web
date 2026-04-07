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
    @location(3) softness : f32,
    @location(4) density : f32,
    @location(5) effectType : f32,
};

@vertex
fn vs_main(
    @location(0) a_pos      : vec2<f32>,
    @location(1) i_position : vec2<f32>,
    @location(2) i_radius   : f32,
    @location(3) i_color    : vec3<f32>,
    @location(4) i_alpha    : f32,
    @location(5) i_softness : f32,
    @location(6) i_density  : f32,
    @location(7) i_effectType : f32,
) -> VSOut {
    var out : VSOut;

    let scaled = a_pos * i_radius;
    let worldPos = scaled + i_position;
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.color = i_color;
    out.localPos = a_pos;
    out.alpha = i_alpha;
    out.softness = i_softness;
    out.density = i_density;
    out.effectType = i_effectType;

    return out;
}

fn hash21(p : vec2<f32>) -> f32 {
    let h = dot(p, vec2<f32>(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
}

fn noise21(p : vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);

    let a = hash21(i);
    let b = hash21(i + vec2<f32>(1.0, 0.0));
    let c = hash21(i + vec2<f32>(0.0, 1.0));
    let d = hash21(i + vec2<f32>(1.0, 1.0));

    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbm(p : vec2<f32>) -> f32 {
    var value = 0.0;
    var amp = 0.5;
    var freq = 1.0;

    for (var i = 0; i < 4; i = i + 1) {
        value = value + amp * noise21(p * freq);
        freq = freq * 2.03;
        amp = amp * 0.5;
    }

    return value;
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let dist = length(input.localPos);
    let w = fwidth(dist);

    if (input.effectType < 0.5) {
        let plume = 1.0 - smoothstep(0.24 - w, 1.02 + w, dist);
        let shell = 1.0 - smoothstep(0.72 - w, 1.22 + w, dist);
        let drift = vec2<f32>(uniforms.timeSec * 0.045, -uniforms.timeSec * 0.03);
        let uv = input.localPos * (2.8 + input.density * 2.4);
        let n1 = fbm(uv + drift);
        let n2 = fbm(uv.yx * 1.35 + vec2<f32>(4.2, -2.1) - drift * 1.4);
        let curl = sin(uv.x * 1.5 + uniforms.timeSec * 0.8) * cos(uv.y * 1.2 - uniforms.timeSec * 0.55);
        let erosion = smoothstep(0.18, 0.92, 0.45 * n1 + 0.35 * n2 + 0.2 * (curl * 0.5 + 0.5));
        let softBody = plume * erosion;
        let rim = shell * (0.55 + 0.45 * n2);
        let softness = mix(0.35, 1.2, input.softness);
        let densityBoost = mix(0.85, 1.4, clamp(input.density - 0.8, 0.0, 1.0));
        let alpha = max(softBody * softness, rim * 0.9) * input.alpha * densityBoost;
        let coolTint = mix(input.color, vec3<f32>(0.82, 0.86, 0.9), rim * 0.35);
        let finalColor = mix(coolTint * 0.78, coolTint * 1.08, softBody);
        return vec4<f32>(finalColor * alpha, alpha);
    }

    let p = input.localPos;
    let upward = clamp((p.y + 1.0) * 0.5, 0.0, 1.0);
    let radial = 1.0 - smoothstep(0.08, 1.0, dist);
    let taper = 1.0 - smoothstep(0.55, 1.18, abs(p.x) + upward * 0.28);
    let flameMask = radial * taper;

    let flow = vec2<f32>(p.x * (2.8 + upward * 1.1), p.y * 3.8 - uniforms.timeSec * (2.4 + input.density));
    let turbulence = fbm(flow + vec2<f32>(0.0, -upward * 1.6));
    let tongues = fbm(flow * 1.9 + vec2<f32>(3.4, 1.2));
    let breakup = smoothstep(0.24, 0.95, turbulence * 0.7 + tongues * 0.5 - upward * 0.08);
    let core = flameMask * breakup;

    let heatRipple = sin((p.x + turbulence) * 14.0 + uniforms.timeSec * 8.0) * (1.0 - upward) * 0.08;
    let emberNoise = noise21(flow * 3.5 + vec2<f32>(uniforms.timeSec * 3.0, -uniforms.timeSec * 1.3));
    let embers = smoothstep(0.86, 0.99, emberNoise) * flameMask * (0.3 + 0.7 * (1.0 - upward));

    let baseColor = mix(vec3<f32>(1.0, 0.2, 0.03), vec3<f32>(1.0, 0.58, 0.08), clamp(upward * 1.2, 0.0, 1.0));
    let hotCore = mix(baseColor, vec3<f32>(1.0, 0.9, 0.55), clamp(core * 1.6, 0.0, 1.0));
    let edgeGlow = vec3<f32>(1.0, 0.22, 0.02) * (0.35 + 0.65 * turbulence);
    let finalColor = mix(edgeGlow, hotCore, clamp(core + 0.2, 0.0, 1.0)) + embers * vec3<f32>(1.4, 0.8, 0.2);

    let alpha = clamp((core * 1.15 + flameMask * 0.35 + embers * 0.8 + heatRipple) * input.alpha, 0.0, 1.2);
    return vec4<f32>(finalColor * alpha, alpha);
}
