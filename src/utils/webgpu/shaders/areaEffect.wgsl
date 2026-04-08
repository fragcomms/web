struct Uniforms {
    viewProj : mat4x4<f32>,
    timeSec : f32,
    _pad0 : vec3<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

struct SmokeFieldParams {
    mapMin : vec2<f32>,
    mapMax : vec2<f32>,
};

@group(1) @binding(0) var smokeSampler : sampler;
@group(1) @binding(1) var smokeField : texture_2d<f32>;
@group(1) @binding(2) var<uniform> smokeParams : SmokeFieldParams;

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec3<f32>,
    @location(1) localPos : vec2<f32>,
    @location(2) alpha : f32,
    @location(3) softness : f32,
    @location(4) density : f32,
    @location(5) effectType : f32,
    @location(6) worldPos : vec2<f32>,
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
    out.worldPos = worldPos;

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

fn ridgeFbm(p : vec2<f32>) -> f32 {
    var value = 0.0;
    var amp = 0.5;
    var freq = 1.0;

    for (var i = 0; i < 4; i = i + 1) {
        let n = noise21(p * freq);
        value = value + (1.0 - abs(n * 2.0 - 1.0)) * amp;
        freq = freq * 2.14;
        amp = amp * 0.55;
    }

    return value;
}

fn sampleSmokeField(worldPos : vec2<f32>) -> vec3<f32> {
    let size = max(smokeParams.mapMax - smokeParams.mapMin, vec2<f32>(1.0, 1.0));
    let uv = clamp(vec2<f32>(
        (worldPos.x - smokeParams.mapMin.x) / size.x,
        (smokeParams.mapMax.y - worldPos.y) / size.y
    ), vec2<f32>(0.0), vec2<f32>(1.0));
    let sample = textureSampleLevel(smokeField, smokeSampler, uv, 0.0);
    return vec3<f32>(0.0, 0.0, sample.x);
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let dist = length(input.localPos);
    let w = fwidth(dist);
    let field = sampleSmokeField(input.worldPos);

    if (input.effectType < 0.5) {
        let displacedLocal = input.localPos + field.xy;
        let displacedDist = length(displacedLocal);
        let plume = 1.0 - smoothstep(0.24 - w, 1.02 + w, displacedDist);
        let shell = 1.0 - smoothstep(0.72 - w, 1.22 + w, displacedDist);
        let drift = vec2<f32>(uniforms.timeSec * 0.045, -uniforms.timeSec * 0.03);
        let uv = displacedLocal * (2.8 + input.density * 2.4);
        let n1 = fbm(uv + drift);
        let n2 = fbm(uv.yx * 1.35 + vec2<f32>(4.2, -2.1) - drift * 1.4);
        let curl = sin(uv.x * 1.5 + uniforms.timeSec * 0.8) * cos(uv.y * 1.2 - uniforms.timeSec * 0.55);
        let erosion = smoothstep(0.18, 0.92, 0.45 * n1 + 0.35 * n2 + 0.2 * (curl * 0.5 + 0.5));
        let wakeCut = 1.0 - field.z * 1.15 * smoothstep(0.06, 0.92, displacedDist);
        let flowDir = normalize(field.xy + vec2<f32>(0.0001, 0.0));
        let tailAxis = dot(displacedLocal, flowDir);
        let tailCross = abs(dot(displacedLocal, vec2<f32>(-flowDir.y, flowDir.x)));
        let tail = field.z
            * smoothstep(-0.18, 0.18, tailAxis)
            * (1.0 - smoothstep(0.18, 1.75, tailAxis))
            * (1.0 - smoothstep(0.02, 0.34, tailCross));
        let outerWisp = field.z
            * smoothstep(0.86, 1.55, displacedDist)
            * (1.0 - smoothstep(1.55, 2.35, displacedDist))
            * (0.55 + 0.45 * n2);
        let softBody = plume * erosion * wakeCut;
        let rim = shell * (0.55 + 0.45 * n2) * (1.0 + field.z * 0.65);
        let softness = mix(0.35, 1.2, input.softness);
        let densityBoost = mix(0.85, 1.4, clamp(input.density - 0.8, 0.0, 1.0));
        let rippedBody = max(softBody * softness, rim * 0.9);
        let alpha = (rippedBody + tail * 0.9 + outerWisp * 0.6) * input.alpha * densityBoost;
        let coolTint = mix(input.color, vec3<f32>(0.82, 0.86, 0.9), rim * 0.35 + field.z * 0.28);
        let finalColor = mix(coolTint * 0.78, coolTint * 1.12, softBody + tail * 0.45);
        return vec4<f32>(finalColor * alpha, alpha);
    }

    let p = input.localPos;
    let upward = clamp((p.y + 1.0) * 0.5, 0.0, 1.0);
    let centerBias = 1.0 - smoothstep(0.0, 0.78, abs(p.x));
    let radial = 1.0 - smoothstep(0.04, 1.02, dist);
    let stem = 1.0 - smoothstep(0.34, 1.08, abs(p.x) + upward * 0.2);
    let crown = 1.0 - smoothstep(0.44, 1.18, abs(p.x) + (1.0 - upward) * 0.28);
    let envelope = radial * mix(stem, crown, upward);

    let drift = uniforms.timeSec * (2.1 + input.density * 0.45);
    let flow = vec2<f32>(
        p.x * (3.4 + upward * 1.3),
        p.y * 4.9 - drift
    );
    let curl = fbm(flow + vec2<f32>(0.0, -upward * 1.8));
    let ridge = ridgeFbm(flow * vec2<f32>(1.4, 1.9) + vec2<f32>(2.8, -1.6));
    let tonguesNoise = fbm(flow * 2.35 + vec2<f32>(4.3, 1.2));
    let fineTongues = ridgeFbm(flow * 4.2 + vec2<f32>(-2.2, 5.1));
    let sideLick = sin((p.x * 10.0 + curl * 4.0) + drift * 2.4) * 0.5 + 0.5;
    let flameShape = smoothstep(
        0.2,
        0.92,
        curl * 0.34 + ridge * 0.32 + tonguesNoise * 0.24 + fineTongues * 0.18 - upward * 0.05
    );
    let tongues = envelope * flameShape;
    let innerTongues = tongues * smoothstep(0.18, 0.92, ridge + fineTongues * 0.45);
    let sideTongues = envelope * smoothstep(0.48, 0.94, sideLick) * centerBias * (0.16 + 0.84 * (1.0 - upward));

    let hotPocketNoise = ridgeFbm(flow * 3.2 + vec2<f32>(6.8, -3.4));
    let hotPocket = smoothstep(0.56, 0.94, hotPocketNoise) * tongues * (1.0 - upward * 0.45);
    let whiteCore = hotPocket * smoothstep(0.1, 0.65, centerBias + (1.0 - upward) * 0.45);

    let sootNoise = fbm(flow * 1.3 + vec2<f32>(-1.8, 2.6));
    let sootFringe = envelope
        * smoothstep(0.12, 0.44, abs(p.x) + upward * 0.08)
        * (1.0 - smoothstep(0.44, 0.82, abs(p.x) + upward * 0.08))
        * smoothstep(0.34, 0.88, sootNoise);

    let shimmer = ridgeFbm(flow * 6.2 + vec2<f32>(drift * 0.4, -drift * 0.22));
    let heatHalo = envelope
        * (1.0 - smoothstep(0.18, 0.92, dist))
        * (0.16 + 0.84 * smoothstep(0.42, 0.96, shimmer))
        * (0.45 + 0.55 * (1.0 - upward));

    let emberFieldA = noise21(flow * 6.8 + vec2<f32>(uniforms.timeSec * 4.8, -uniforms.timeSec * 2.0));
    let emberFieldB = ridgeFbm(flow * 5.6 + vec2<f32>(-3.8, 2.1) + vec2<f32>(uniforms.timeSec * 1.2, -uniforms.timeSec * 3.4));
    let embers = smoothstep(0.88, 0.985, emberFieldA) * envelope * (0.45 + 0.55 * (1.0 - upward))
        + smoothstep(0.82, 0.96, emberFieldB) * sootFringe * 0.55;

    let flameAlpha = tongues * 1.08 + innerTongues * 0.48 + sideTongues * 0.28 + heatHalo * 0.24;
    let alpha = clamp((flameAlpha + embers * 0.78 - sootFringe * 0.18) * input.alpha, 0.0, 1.35);

    let deepRed = vec3<f32>(0.86, 0.09, 0.01);
    let orange = vec3<f32>(1.0, 0.42, 0.04);
    let gold = vec3<f32>(1.0, 0.72, 0.16);
    let whiteHot = vec3<f32>(1.0, 0.95, 0.72);
    let sootColor = vec3<f32>(0.18, 0.08, 0.04);

    var finalColor = mix(deepRed, orange, clamp(tongues * 0.78 + sideTongues * 0.2, 0.0, 1.0));
    finalColor = mix(finalColor, gold, clamp(innerTongues * 0.72 + hotPocket * 0.34, 0.0, 1.0));
    finalColor = mix(finalColor, whiteHot, clamp(whiteCore * 1.25, 0.0, 1.0));
    finalColor = mix(finalColor, sootColor, sootFringe * 0.42);
    finalColor = finalColor + embers * vec3<f32>(1.35, 0.82, 0.22) + heatHalo * vec3<f32>(0.22, 0.08, 0.02);

    return vec4<f32>(finalColor * alpha, alpha);
}
